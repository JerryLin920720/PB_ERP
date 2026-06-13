import io
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse

class ReportMixin:
    """
    Phase 6A ReportMixin
    Provides standard /report/ endpoint for PDF and Excel export.
    Supports:
    - selectedRecord: fetch single record by record_id
    - currentQuery: fetch list based on query parameters (applies standard filters)
    """
    
    # 預設支援的報表設定，可由 ViewSet 覆寫
    report_config = {}

    @action(detail=False, methods=["post"], url_path="report")
    def report(self, request, *args, **kwargs):
        data = request.data
        report_key = data.get("report_key")
        format_type = data.get("format", "pdf")
        mode = data.get("mode", "currentQuery")
        record_id = data.get("record_id")
        
        if not report_key:
            return Response({"success": False, "detail": "Missing report_key"}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. 取得資料
        if mode == "selectedRecord":
            if not record_id:
                return Response({"success": False, "detail": "Missing record_id for selectedRecord mode"}, status=status.HTTP_400_BAD_REQUEST)
            
            # 使用 get_queryset 確保套用 DataConstraint (如果該 record 不在權限內會找不到)
            qs = self.filter_queryset(self.get_queryset())
            try:
                # 這裡假設 lookup_field 是預設的，也可以用 self.lookup_field
                record = qs.get(pk=record_id)
            except qs.model.DoesNotExist:
                return Response({"success": False, "detail": "Record not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
                
            # 序列化單筆資料
            serializer = self.get_serializer(record)
            report_data = [serializer.data]
            
        else: # currentQuery
            qs = self.filter_queryset(self.get_queryset())
            # 此處可加入更多的 custom query parameters 處理，若有需要
            # 這裡簡單序列化全部查詢結果 (注意大量資料效能，真實環境應有 limit)
            # 限縮 1000 筆防止記憶體爆掉
            qs = qs[:1000]
            serializer = self.get_serializer(qs, many=True)
            report_data = serializer.data
            
        # 2. 產生檔案
        if format_type == "excel":
            return self._generate_excel(report_key, report_data)
        elif format_type == "pdf":
            return self._generate_pdf(report_key, report_data, mode)
        else:
            return Response({"success": False, "detail": "Unsupported format"}, status=status.HTTP_400_BAD_REQUEST)
            
    def _generate_excel(self, report_key, report_data):
        try:
            import openpyxl
        except ImportError:
            return Response({"success": False, "detail": "openpyxl not installed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = report_key
        
        if not report_data:
            ws.append(["No Data"])
        else:
            # 取第一筆當作 header
            headers = list(report_data[0].keys())
            # 過濾掉太深層的物件 (只寫基本型態)
            headers = [h for h in headers if isinstance(report_data[0][h], (str, int, float, bool, type(None)))]
            ws.append(headers)
            
            for row in report_data:
                row_data = [str(row.get(h, "")) if row.get(h) is not None else "" for h in headers]
                ws.append(row_data)
                
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        response = HttpResponse(
            output.read(), 
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{report_key}.xlsx"'
        return response

    def _generate_pdf(self, report_key, report_data, mode):
        # 這裡只是初版 PDF stub，因為要實作完整 PDF 排版需要 reportlab 或 weasyprint
        # 本次目標為基礎設施打通，所以先回傳簡易文字型 PDF 或純文字
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4
            
            output = io.BytesIO()
            p = canvas.Canvas(output, pagesize=A4)
            p.drawString(100, 800, f"Report: {report_key}")
            p.drawString(100, 780, f"Mode: {mode}")
            p.drawString(100, 760, f"Records count: {len(report_data)}")
            
            y = 730
            for row in report_data[:20]: # 最多印 20 筆示意
                text = str(row)[:100] + "..." # 截斷顯示
                p.drawString(100, y, text)
                y -= 20
                if y < 50:
                    p.showPage()
                    y = 800
                    
            p.save()
            output.seek(0)
            
            response = HttpResponse(output.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{report_key}.pdf"'
            return response
            
        except ImportError:
            # 如果沒有 reportlab，先給 dummy PDF 或純文字替代
            return Response({"success": False, "detail": "reportlab not installed, please install reportlab for PDF generation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
