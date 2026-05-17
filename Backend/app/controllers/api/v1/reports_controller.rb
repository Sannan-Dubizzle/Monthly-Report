module Api
  module V1
    class ReportsController < ApplicationController
      def form_schema
        require_permission!('reports:new') and return unless performed?
        unit = Unit.find_by(id: params[:unit_id])
        return render json: { error: 'unit_not_found', message: 'No unit found with the given unit_id.' }, status: :not_found unless unit
        month = Date.today.prev_month.beginning_of_month
        sections = FormSection.includes(form_section_fields: { field: [] })
                              .where(scope_level: unit.scope_level, is_active: true)
                              .order(:order_index)
        last_report = MonthlyReport.where(unit: unit).where('month < ?', month).order(month: :desc).first
        render json: build_form_schema(unit, month, sections, last_report)
      end

      def index
        require_permission!('reports:list') and return unless performed?
        scope = MonthlyReport.includes(:unit, :president_member)
        scope = scope.where(unit_id: params[:unit_id]) if params[:unit_id]
        scope = scope.where(status: params[:status]) if params[:status]
        scope = apply_report_filter(scope)
        total = scope.count
        scope = scope.page(params[:page]).per(params[:per_page] || 20)
        render json: {
          data: scope.map { |r| report_list_json(r) },
          meta: { page: (params[:page] || 1).to_i, per_page: (params[:per_page] || 20).to_i, total: total }
        }
      end

      def show
        require_permission!('reports:read') and return unless performed?
        report = find_accessible_report(params[:id])
        return render json: { error: 'not_found' }, status: :not_found unless report
        render json: report_detail_json(report, include_ancestors: params[:include] == 'ancestors')
      end

      def create
        require_permission!('reports:create') and return unless performed?
        existing = MonthlyReport.find_by(unit_id: params[:unit_id], month: params[:month])
        if existing
          return render json: { error: 'report_exists', message: 'A report for this UC and month already exists.', existing_report_id: existing.id }, status: :conflict
        end
        report = MonthlyReport.new(report_params.merge(created_by: current_member))
        ActiveRecord::Base.transaction do
          report.save!
          create_activities(report, params[:activities])
          create_field_values(report, params[:field_values])
        end
        render json: report_detail_json(report), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: [e.message] }, status: :unprocessable_entity
      end

      def update
        require_permission!('reports:update') and return unless performed?
        report = find_accessible_report(params[:id])
        return render json: { error: 'not_found' }, status: :not_found unless report
        unless report.editable_by?(current_member)
          return render json: { error: 'report_locked', message: 'This report has been locked and cannot be edited.' }, status: :forbidden
        end
        ActiveRecord::Base.transaction do
          report.update!(patch_report_params)
          upsert_field_values(report, params[:field_values]) if params[:field_values]
          patch_activities(report, params[:activities]) if params[:activities]
        end
        render json: report_detail_json(report)
      rescue ActiveRecord::RecordNotFound => e
        render json: { error: 'invalid_field', message: e.message }, status: :unprocessable_entity
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: [e.message] }, status: :unprocessable_entity
      end

      def lock_zone
        require_permission!('reports:lock_zone') and return unless performed?
        report = MonthlyReport.find(params[:id])
        zone = report.unit.zone? ? report.unit : report.unit.parent
        month = report.month
        uc_ids = zone.children.pluck(:id)
        existing_ids = MonthlyReport.where(unit_id: uc_ids, month: month).pluck(:unit_id)
        missing = uc_ids - existing_ids
        if missing.any?
          return render json: { error: 'missing_reports', message: "#{missing.size} UCs have not submitted reports yet.", missing_unit_ids: missing }, status: :bad_request
        end
        locked_at = Time.current
        reports = MonthlyReport.where(unit_id: uc_ids, month: month)
        reports.update_all(status: 'zone_locked', locked_at: locked_at)
        render json: { locked_report_ids: reports.pluck(:id), locked_at: locked_at, locked_by: current_member.id }
      end

      def finalize
        require_permission!('reports:finalize') and return unless performed?
        report = MonthlyReport.find(params[:id])
        zila = find_zila(report.unit)
        month = report.month
        all_unit_ids = collect_all_unit_ids(zila)
        reports = MonthlyReport.where(unit_id: all_unit_ids, month: month)
        finalized_at = Time.current
        reports.update_all(status: 'finalized', finalized_at: finalized_at)
        render json: { finalized_report_ids: reports.pluck(:id), finalized_at: finalized_at, finalized_by: current_member.id }
      end

      def export
        require_permission!('reports:export') and return unless performed?
        unit = Unit.find(params[:unit_id])
        month = Date.parse("#{params[:month]}-01")
        reports = gather_reports_for_export(unit, month)
        if reports.empty?
          return render json: { error: 'not_found', message: 'No finalized report found for this unit and month.' }, status: :not_found
        end
        xlsx = ExportService.build_xlsx(unit, month, reports)
        filename = "report_#{unit.name.parameterize}_#{params[:month]}.xlsx"
        send_data xlsx, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        disposition: "attachment; filename=\"#{filename}\""
      end

      private

      def report_params
        params.permit(:unit_id, :month, :president_member_id, :secretary_member_id)
      end

      def patch_report_params
        params.permit(:president_member_id, :secretary_member_id)
      end

      def find_accessible_report(id)
        MonthlyReport.includes(:unit, :report_activities, :report_field_values).find_by(id: id)
      end

      def apply_report_filter(scope)
        roles = current_member.member_roles.where(revoked_at: nil).includes(:role).map { |mr| mr.role.name }
        return scope if roles.include?('ZILA_PRESIDENT') || roles.include?('ZILA_SECRETARY')
        member_uc = current_member.uc
        if roles.any? { |r| r.start_with?('ZONE_') }
          zone = member_uc.parent
          uc_ids = zone.children.pluck(:id)
          scope.where(unit_id: uc_ids)
        else
          scope.where(unit_id: member_uc.id)
        end
      end

      def create_activities(report, activities_params)
        return unless activities_params
        activities_params.each do |a|
          report.report_activities.create!(
            definition_id: a[:definition_id],
            name: a[:name],
            occurrences: a[:occurrences] || 1,
            avg_attendance: a[:avg_attendance],
            conductor: a[:conductor],
            notes: a[:notes]
          )
        end
      end

      def create_field_values(report, fvs)
        return unless fvs
        fvs.each do |fv|
          field = FormField.find(fv[:field_id])
          report.report_field_values.create!(field: field, value: fv[:value])
        end
      end

      def upsert_field_values(report, fvs)
        fvs.each do |fv|
          field = FormField.find_by!(id: fv[:field_id])
          rfv = report.report_field_values.find_or_initialize_by(field: field)
          rfv.update!(value: fv[:value])
        end
      end

      def patch_activities(report, acts)
        (acts[:add] || []).each { |a| report.report_activities.create!(a.permit(:definition_id, :name, :occurrences, :avg_attendance, :conductor, :notes)) }
        (acts[:update] || []).each do |a|
          ra = report.report_activities.find(a[:id])
          ra.update!(a.except(:id))
        end
        (acts[:remove] || []).each { |id| report.report_activities.find(id).destroy! }
      end

      def report_list_json(r)
        { id: r.id, unit_id: r.unit_id, unit_name: r.unit.name, unit_scope: r.unit.scope_level,
          month: r.month, status: r.status, president: r.president_member&.name, created_at: r.created_at }
      end

      def report_detail_json(report, include_ancestors: false)
        unit_data = { id: report.unit.id, name: report.unit.name, scope_level: report.unit.scope_level, parent_id: report.unit.parent_id }
        unit_data[:ancestors] = report.unit.ancestors.map { |a| { id: a.id, name: a.name, scope_level: a.scope_level } } if include_ancestors
        {
          id: report.id,
          status: report.status,
          unit: unit_data,
          month: report.month,
          president_member_id: report.president_member_id,
          secretary_member_id: report.secretary_member_id,
          activities: report.report_activities.map { |a| activity_json(a) },
          field_values: report.report_field_values.map { |fv| field_value_json(fv) },
          created_at: report.created_at,
          updated_at: report.updated_at,
          locked_at: report.locked_at,
          finalized_at: report.finalized_at
        }
      end

      def activity_json(a)
        { id: a.id, definition_id: a.definition_id, name: a.name, occurrences: a.occurrences,
          avg_attendance: a.avg_attendance, conductor: a.conductor }
      end

      def field_value_json(fv)
        { field_id: fv.field_id, field_key: fv.field.key, value: fv.value }
      end

      def build_form_schema(unit, month, sections, last_report)
        {
          unit: { id: unit.id, name: unit.name, scope_level: unit.scope_level },
          month: month,
          sections: sections.map { |s| section_schema_json(s, unit, last_report) }
        }
      end

      def section_schema_json(section, unit, last_report)
        {
          key: section.key,
          label: section.label,
          order_index: section.order_index,
          fields: section.form_section_fields.order(:order_index).map { |fsf| field_schema_json(fsf.field, unit, last_report) }
        }
      end

      def field_schema_json(field, unit, last_report)
        prefill = resolve_prefill(field, unit, last_report)
        options = field.field_type == 'activity_list' ? activity_list_options(unit) : field.options
        {
          key: field.key,
          label: field.label,
          type: field.field_type,
          is_required: field.is_required,
          prefill_value: prefill,
          options: options,
          validation: field.validation,
          helper_text: field.helper_text
        }
      end

      def resolve_prefill(field, unit, last_report)
        case field.prefill_source
        when 'unit.president_id'
          p = unit.president
          p ? { id: p.id, name: p.name } : nil
        when 'last_report.secretary_member_id'
          return nil unless last_report&.secretary_member
          { id: last_report.secretary_member.id, name: last_report.secretary_member.name }
        end
      end

      def activity_list_options(unit)
        defs = ActivityDefinition.where(scope_level: unit.scope_level, is_active: true)
        { definitions: defs.map { |d| { id: d.id, name: d.name, compulsory_per_month: d.compulsory_per_month } }, allow_custom: true }
      end

      def find_zila(unit)
        current = unit
        current = current.parent while !current.zila? && current.parent
        current
      end

      def collect_all_unit_ids(zila)
        ids = [zila.id]
        zila.children.each do |zone|
          ids << zone.id
          ids.concat(zone.children.pluck(:id))
        end
        ids
      end

      def gather_reports_for_export(unit, month)
        unit_ids = if unit.uc?
                     [unit.id]
                   elsif unit.zone?
                     [unit.id] + unit.children.pluck(:id)
                   else
                     collect_all_unit_ids(unit)
                   end
        MonthlyReport.where(unit_id: unit_ids, month: month, status: 'finalized')
                     .includes(:unit, :report_activities, :report_field_values)
      end
    end
  end
end
