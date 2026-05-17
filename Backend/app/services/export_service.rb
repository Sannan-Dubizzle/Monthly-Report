require 'rubyXL'

class ExportService
  def self.build_xlsx(unit, month, reports)
    workbook = RubyXL::Workbook.new
    workbook.worksheets.delete_at(0) if workbook.worksheets.first

    reports.each do |report|
      sheet = workbook.add_worksheet(report.unit.name.truncate(31))
      sheet.add_cell(0, 0, 'Field')
      sheet.add_cell(0, 1, 'Value')
      sheet.add_cell(1, 0, 'Unit')
      sheet.add_cell(1, 1, report.unit.name)
      sheet.add_cell(2, 0, 'Month')
      sheet.add_cell(2, 1, report.month.to_s)
      sheet.add_cell(3, 0, 'Status')
      sheet.add_cell(3, 1, report.status)
      row = 4
      report.report_field_values.each do |fv|
        sheet.add_cell(row, 0, fv.field&.key)
        sheet.add_cell(row, 1, fv.value)
        row += 1
      end
      row += 1
      sheet.add_cell(row, 0, 'Activities')
      row += 1
      sheet.add_cell(row, 0, 'Name')
      sheet.add_cell(row, 1, 'Occurrences')
      sheet.add_cell(row, 2, 'Avg Attendance')
      sheet.add_cell(row, 3, 'Total Attendance')
      row += 1
      report.report_activities.each do |a|
        sheet.add_cell(row, 0, a.name)
        sheet.add_cell(row, 1, a.occurrences)
        sheet.add_cell(row, 2, a.avg_attendance)
        sheet.add_cell(row, 3, a.total_attendance)
        row += 1
      end
    end

    workbook.stream.string
  end
end
