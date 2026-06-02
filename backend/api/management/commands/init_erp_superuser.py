import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import SysAccount, generate_pb_gkey

class Command(BaseCommand):
    help = 'Initialize ERP superuser and corresponding SysAccount'

    def handle(self, *args, **options):
        username = os.environ.get('ERP_SUPERUSER_USERNAME', 'admin')
        password = os.environ.get('ERP_SUPERUSER_PASSWORD', 'admin123456')
        display_name = os.environ.get('ERP_SUPERUSER_DISPLAY_NAME', '系統管理員')

        is_dev_fallback = (
            username == 'admin' and 
            password == 'admin123456'
        )

        if is_dev_fallback:
            self.stdout.write(
                self.style.WARNING(
                    '[WARNING] Using default development ERP superuser password. '
                    'Please change it in production.'
                )
            )

        # 0. Ensure unmanaged legacy tables exist in the database
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_menu (
                    prg_code VARCHAR(20) PRIMARY KEY,
                    obj_name VARCHAR(100),
                    prg_name VARCHAR(100),
                    parent_code VARCHAR(10),
                    fram_class VARCHAR(1),
                    prg_serialno DECIMAL(10, 2),
                    sysflag VARCHAR(1),
                    chinesebigname VARCHAR(100),
                    chinesesimpname VARCHAR(100),
                    englishname VARCHAR(150),
                    vietnamname VARCHAR(150),
                    initflag VARCHAR(1),
                    startqty VARCHAR(4),
                    endqty VARCHAR(4),
                    yearly VARCHAR(4),
                    season VARCHAR(20),
                    pictype VARCHAR(1),
                    makerdf VARCHAR(1)
                )
            """)
            # Widen columns if table already exists
            try:
                cursor.execute("ALTER TABLE sys_menu ALTER COLUMN obj_name TYPE VARCHAR(100);")
                cursor.execute("ALTER TABLE sys_menu ALTER COLUMN prg_name TYPE VARCHAR(100);")
                cursor.execute("ALTER TABLE sys_menu ALTER COLUMN chinesebigname TYPE VARCHAR(100);")
                cursor.execute("ALTER TABLE sys_menu ALTER COLUMN chinesesimpname TYPE VARCHAR(100);")
                cursor.execute("ALTER TABLE sys_menu ALTER COLUMN englishname TYPE VARCHAR(150);")
                cursor.execute("ALTER TABLE sys_menu ALTER COLUMN vietnamname TYPE VARCHAR(150);")
            except Exception as e:
                # ignore if columns already widened or database doesn't support ALTER in this way
                pass

            # Add new columns if table already exists but doesn't have them
            for col_name, col_type in [
                ('initflag', 'VARCHAR(1)'),
                ('startqty', 'VARCHAR(4)'),
                ('endqty', 'VARCHAR(4)'),
                ('yearly', 'VARCHAR(4)'),
                ('season', 'VARCHAR(20)'),
                ('pictype', 'VARCHAR(1)'),
                ('makerdf', 'VARCHAR(1)'),
            ]:
                try:
                    cursor.execute(f"ALTER TABLE sys_menu ADD COLUMN {col_name} {col_type};")
                except Exception:
                    pass

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_popedom (
                    id SERIAL PRIMARY KEY,
                    accounts_id VARCHAR(50),
                    obj_name VARCHAR(100),
                    prg_popedom VARCHAR(20),
                    flag VARCHAR(10),
                    hisystem VARCHAR(10)
                )
            """)
            try:
                cursor.execute("ALTER TABLE sys_popedom ALTER COLUMN obj_name TYPE VARCHAR(100);")
            except Exception:
                pass

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_popedom_desc (
                    id SERIAL PRIMARY KEY,
                    hisystem VARCHAR(10),
                    obj_name VARCHAR(100),
                    popedom_id VARCHAR(30),
                    popedom_desc VARCHAR(50),
                    popedom_index INTEGER
                )
            """)
            try:
                cursor.execute("ALTER TABLE sys_popedom_desc ALTER COLUMN obj_name TYPE VARCHAR(100);")
                cursor.execute("ALTER TABLE sys_popedom_desc ALTER COLUMN popedom_desc TYPE VARCHAR(50);")
            except Exception:
                pass

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sys_accounts_active (
                    gkey VARCHAR(20) PRIMARY KEY,
                    hisystem VARCHAR(10),
                    accounts_id VARCHAR(50),
                    logintime TIMESTAMP,
                    computername VARCHAR(50),
                    loginip VARCHAR(50),
                    spid INTEGER,
                    win_login VARCHAR(50)
                )
            """)
        self.stdout.write(self.style.SUCCESS("Verified/Created legacy unmanaged tables with wider columns: sys_menu, sys_popedom, sys_popedom_desc, sys_accounts_active."))

        menus_to_seed = [
            # 系統設置 (SS)
            ("SS", "", "系統設置管理系統", None, "0", 1.0, "0", "系統設置管理系統", "系统设置管理系统", "System Settings", "Thiết lập hệ thống"),
            ("SS001", "w_ss001", "選單與權限啟用設定", "SS", "1", 1.01, "0", "選單與權限啟用設定", "选单与权限启用设定", "Menu & Permission Setup", "Thiết lập menu & quyền hạn"),
            # 基本資料 (BA)
            ("BA", "", "基本資料管理系統", None, "0", 2.0, "0", "基本資料管理系統", "基本资料管理系统", "Basic Data System", "Dữ liệu cơ bản"),
            ("BA001", "w_ba001", "個人片語字庫設定", "BA", "1", 2.01, "0", "個人片語字庫設定", "个人片语字库设定", "Personal Phrase Setup", "Từ điển cá nhân"),
            ("BA002", "w_ba002", "國家設定", "BA", "1", 2.02, "0", "國家設定", "国家设定", "Country Setup", "Thiết lập quốc gia"),
            ("BA003", "w_ba003", "產地設定", "BA", "1", 2.03, "0", "產地設定", "产地设定", "Origin Setup", "Thiết lập xuất xứ"),
            ("BA004", "w_ba004", "地區設定", "BA", "1", 2.04, "0", "地區設定", "地区设定", "Region Setup", "Thiết lập khu vực"),
            ("BA005", "w_ba005", "公司設定", "BA", "1", 2.05, "0", "公司設定", "公司设定", "Company Setup", "Thiết lập công ty"),
            ("BA009", "w_ba009", "品牌設定", "BA", "1", 2.09, "0", "品牌設定", "品牌设定", "Brand Setup", "Thiết lập thương hiệu"),
            ("BA010", "w_ba010", "客戶資料管理", "BA", "1", 2.10, "0", "客戶資料管理", "客户资料管理", "Customer Management", "Quản lý khách hàng"),
            ("BA015", "w_ba015", "工廠資料管理", "BA", "1", 2.15, "0", "工廠資料管理", "工厂资料管理", "Factory Management", "Quản lý nhà máy"),
            ("BA020", "w_ba020", "材料供應商類別設定", "BA", "1", 2.20, "0", "材料供應商類別設定", "材料供应商类别设定", "Material Vendor Category", "Phân loại nhà cung cấp"),
            ("BA025", "w_ba025", "材料商資料管理", "BA", "1", 2.25, "0", "材料商資料管理", "材料商资料管理", "Material Vendor Management", "Quản lý NCC vật liệu"),
            ("BA030", "w_ba030", "供應商資料管理", "BA", "1", 2.30, "0", "供應商資料管理", "供应商资料管理", "Vendor Management", "Quản lý nhà cung cấp"),
            ("BA040", "w_ba040", "銀行設定", "BA", "1", 2.40, "0", "銀行設定", "银行设定", "Bank Setup", "Thiết lập ngân hàng"),
            ("BA045", "w_ba045", "部門設定", "BA", "1", 2.45, "0", "部門設定", "部门设定", "Department Setup", "Thiết lập bộ phận"),
            ("BA050", "w_ba050", "職務設定", "BA", "1", 2.50, "0", "職務設定", "职务设定", "Position Setup", "Thiết lập chức vụ"),
            ("BA055", "w_ba055", "季節設定", "BA", "1", 2.55, "0", "季節設定", "季节设定", "Season Setup", "Thiết lập mùa"),
            ("BA060", "w_ba060", "幣別及匯率設定", "BA", "1", 2.60, "0", "幣別及匯率設定", "币别及汇率设定", "Currency and Rate", "Tiền tệ & tỷ giá"),
            ("BA061", "w_ba061", "幣別兌換匯率設定", "BA", "1", 2.61, "0", "幣別兌換匯率設定", "币别兑换汇率设定", "Exchange Rate Setup", "Quy đổi tỷ giá"),
            ("BA065", "w_ba065", "交易港口設定", "BA", "1", 2.65, "0", "交易港口設定", "交易港口设定", "Port Setup", "Cảng giao dịch"),
            ("BA070", "w_ba070", "交易條件設定", "BA", "1", 2.70, "0", "交易條件設定", "交易条件设定", "Trade Condition Setup", "Điều kiện giao dịch"),
            ("BA075", "w_ba075", "付款條件設定", "BA", "1", 2.75, "0", "付款條件設定", "付款条件设定", "Payment Term Setup", "Điều kiện thanh toán"),
            ("BA080", "w_ba080", "配件設定", "BA", "1", 2.80, "0", "配件設定", "配件设定", "Accessory Setup", "Thiết lập phụ kiện"),
            ("BA085", "w_ba085", "Size Run設定", "BA", "1", 2.85, "0", "Size Run設定", "Size Run设定", "Size Run Setup", "Thiết lập Size Run"),
            ("BA090", "w_ba090", "快遞公司設定", "BA", "1", 2.90, "0", "快遞公司設定", "快递公司设定", "Courier Setup", "Thiết lập CPN"),
            ("BA091", "w_ba091", "運輸方式設定", "BA", "1", 2.91, "0", "運輸方式設定", "运输方式设定", "Shipment Mode Setup", "Phương thức vận chuyển"),
            ("BA092", "w_ba092", "單位設定", "BA", "1", 2.92, "0", "單位設定", "单位设定", "Unit Setup", "Thiết lập đơn vị"),
            ("ES101", "w_es101", "員工資料管理", "BA", "1", 2.99, "0", "員工資料管理", "员工资料管理", "Employee Management", "Quản lý nhân viên"),

            # 開發部門 (DP)
            ("DP", "", "開發部門管理系統", None, "0", 3.0, "0", "開發部門管理系統", "开发部门管理系统", "Product Development System", "Quản lý phát triển"),
            ("DP001", "w_dp001", "開發片語字庫", "DP", "1", 3.01, "0", "開發片語字庫", "开发片语字库", "Development Phrase", "Từ điển phát triển"),
            ("DP002", "w_dp002", "樣品類別設定", "DP", "1", 3.02, "0", "樣品類別設定", "样品类别设定", "Sample Type Setup", "Thiết lập loại mẫu"),
            ("DP003", "w_dp003", "鞋種類別設定", "DP", "1", 3.03, "0", "鞋種類別設定", "鞋种类别设定", "Shoe Type Setup", "Thiết lập loại giày"),
            ("DP004", "w_dp004", "Size Type設定", "DP", "1", 3.04, "0", "Size Type設定", "Size Type设定", "Size Type Setup", "Thiết lập Size Type"),
            ("DP005", "w_dp005", "部位部位工藝設定", "DP", "1", 3.05, "0", "部位部位工藝設定", "部位部位工艺设定", "Part Process Setup", "Công nghệ bộ phận"),
            ("DP006", "w_dp006", "部位資料設定", "DP", "1", 3.06, "0", "部位資料設定", "部位资料设定", "Part Info Setup", "Dữ liệu bộ phận"),
            ("DP007", "w_dp007", "鞋種部位工藝設定", "DP", "1", 3.07, "0", "鞋種部位工藝設定", "鞋种部位工艺设定", "Shoe Part Process", "Bộ phận công nghệ giày"),
            ("DP008", "w_dp008", "Sock Label設定", "DP", "1", 3.08, "0", "Sock Label設定", "Sock Label设定", "Sock Label Setup", "Nhãn lót giày"),
            ("DP009", "w_dp009", "加工方式設定", "DP", "1", 3.09, "0", "加工方式設定", "加工方式设定", "Process Method Setup", "Phương thức gia công"),
            ("DP010", "w_dp010", "楦頭基本資料", "DP", "1", 3.10, "0", "楦頭基本資料", "楦头基本资料", "Last Master Data", "Dữ liệu phom giày (Last)"),
            ("DP015", "w_dp015", "大底基本資料", "DP", "1", 3.15, "0", "大底基本資料", "大底基本资料", "Outsole Master Data", "Dế ngoài (Outsole)"),
            ("DP020", "w_dp020", "鞋跟基本資料", "DP", "1", 3.20, "0", "鞋跟基本資料", "鞋跟基本资料", "Heel Master Data", "Gót giày (Heel)"),
            ("DP023", "w_dp023", "組別基本資料", "DP", "1", 3.23, "0", "組別基本資料", "组别基本资料", "Group Master Data", "Dữ liệu tổ nhóm"),
            ("DP025", "w_dp025", "型體基本資料(BOM)", "DP", "1", 3.25, "0", "型體基本資料(BOM)", "型体基本资料(BOM)", "Style Master BOM", "Dữ liệu hình thể (BOM)"),
            ("DP030", "w_dp030", "樣品單資料管理", "DP", "1", 3.30, "0", "樣品單資料管理", "样品单资料管理", "Sample Order Management", "Quản lý đơn mẫu"),
            ("DP032", "w_dp032", "未完樣品清單", "DP", "1", 3.32, "0", "未完樣品清單", "未完样品清单", "Outstanding Samples", "Mẫu chưa hoàn thành"),
            ("DP035", "w_dp035", "樣品 Label 印製", "DP", "1", 3.35, "0", "樣品 Label 印製", "样品 Label 印制", "Sample Label Print", "In nhãn mẫu"),
            ("DP040", "w_dp040", "樣品寄出快遞管理", "DP", "1", 3.40, "0", "樣品寄出快遞管理", "样品寄出快递管理", "Sample Shipment", "CPN gửi mẫu"),
            ("DP050", "w_dp050", "樣品單狀態審核", "DP", "1", 3.50, "0", "樣品單狀態審核", "样品单状态审核", "Sample Order Review", "Duyệt trạng thái mẫu"),
            ("DP055", "w_dp055", "樣品成本核算", "DP", "1", 3.55, "0", "樣品成本核算", "样品成本核算", "Sample Costing", "Tính giá mẫu"),
            ("DP060", "w_dp060", "大底量產統計", "DP", "1", 3.60, "0", "大底量產統計", "大底量产统计", "Outsole Production Stat", "Thống kê đế ngoài"),
            ("DP065", "w_dp065", "型體量產統計", "DP", "1", 3.65, "0", "型體量產統計", "型体量产统计", "Style Production Stat", "Thống kê hình thể"),
            ("DP070", "w_dp070", "樣品數量綜合統計", "DP", "1", 3.70, "0", "樣品數量綜合統計", "样品数量综合统计", "Sample Qty Statistics", "Thống kê tổng hợp mẫu"),
            ("DP075", "w_dp075", "大底攤銷資料管理", "DP", "1", 3.75, "0", "大底攤銷資料管理", "大底摊销资料管理", "Outsole Amortization", "Phân bổ đế ngoài"),
            ("DP080", "w_dp080", "FittingSample意見書", "DP", "1", 3.80, "0", "FittingSample意見書", "FittingSample意见书", "Fitting Sample Comments", "Ý kiến Fitting Sample"),
            ("DP085", "w_dp085", "CFMSample意見書", "DP", "1", 3.85, "0", "CFMSample意見書", "CFMSample意见书", "CFM Sample Comments", "Ý kiến CFM Sample"),
            ("DP095", "w_dp095", "樣品進度管理查詢", "DP", "1", 3.95, "0", "樣品進度管理查詢", "样品进度管理查询", "Sample Progress Query", "Tiến độ mẫu"),
            ("DP100", "w_dp100", "開發費用轉嫁管理", "DP", "1", 3.99, "0", "開發費用轉嫁管理", "开发费用转嫁管理", "Development Chargeback", "Phí chuyển giao phát triển"),

            # 樣品中心 (SM)
            ("SM", "", "樣品中心管理系統", None, "0", 4.0, "0", "樣品中心管理系統", "样品中心管理系统", "Sample Center System", "Trung tâm mẫu"),

            # 資材部門 (MM)
            ("MM", "", "資材部門管理系統", None, "0", 5.0, "0", "資材部門管理系統", "资材部门管理系统", "Materials Department System", "Quản lý vật tư"),
            ("MR001", "w_mr001", "資材片語字庫設定", "MM", "1", 5.01, "0", "資材片語字庫設定", "资材片语字库设定", "Material Phrase Setup", "Từ điển vật tư"),
            ("MR002", "w_mr002", "顏色大類設定", "MM", "1", 5.02, "0", "顏色大類設定", "颜色大类设定", "Color Category Setup", "Phân loại màu sắc"),
            ("MR010", "w_mr010", "顏色小類設定", "MM", "1", 5.10, "0", "顏色小類設定", "颜色小类设定", "Color Detail Setup", "Màu chi tiết"),
            ("MR015", "w_mr015", "材料大類設定", "MM", "1", 5.15, "0", "材料大類設定", "材料大类设定", "Material Category Setup", "Phân loại vật liệu"),
            ("MR020", "w_mr020", "材料厚度設定", "MM", "1", 5.20, "0", "材料厚度設定", "材料厚度设定", "Material Thickness Setup", "Độ dày vật liệu"),
            ("MR025", "w_mr025", "材料幅度設定", "MM", "1", 5.25, "0", "材料幅度設定", "材料幅度设定", "Material Width Setup", "Khổ rộng vật liệu"),
            ("MR030", "w_mr030", "材料紋路設定", "MM", "1", 5.30, "0", "材料紋路設定", "材料纹路设定", "Material Grain Setup", "Vân vật liệu"),
            ("MR031", "w_mr031", "加工方式設定", "MM", "1", 5.31, "0", "加工方式設定", "加工方式设定", "Material Process Setup", "Phương thức gia công"),
            ("MR035", "w_mr035", "料號主檔設定作業", "MM", "1", 5.35, "0", "料號主檔設定作業", "料号主档设定作业", "Material Master Setup", "Mã vật tư"),
            ("MR040", "w_mr040", "材料貼標列印作業", "MM", "1", 5.40, "0", "材料貼標列印作業", "材料贴标列印作业", "Material Label Print", "In nhãn vật liệu"),
            ("MR045", "w_mr045", "樣品採購單管理", "MM", "1", 5.45, "0", "樣品採購單管理", "样品采购单管理", "Sample Purchase Order", "Đơn mua mẫu"),
            ("MR050", "w_mr050", "樣品調料資料管理", "MM", "1", 5.50, "0", "樣品調料資料管理", "样品调料资料管理", "Sample Material Request", "Điều phối vật tư"),
            ("MR053", "w_mr053", "材料需求查詢作業", "MM", "1", 5.53, "0", "材料需求查詢作業", "材料需求查询作业", "Material Query", "Nhu cầu vật tư"),
            ("MR105", "w_mr105", "入庫作業", "MM", "1", 5.60, "0", "入庫作業", "入库作业", "Warehouse Inbound", "Nhập kho"),
            ("MR110", "w_mr110", "發料管理", "MM", "1", 5.70, "0", "發料管理", "发料管理", "Material Requisition", "Phát cấp vật tư"),
            ("MR115", "w_mr115", "退貨管理", "MM", "1", 5.80, "0", "退貨管理", "退货管理", "Return Management", "Quản lý trả hàng"),
            ("MR125", "w_mr125", "庫存/盤點管理作業", "MM", "1", 5.90, "0", "庫存/盤點管理作業", "库存/盘点管理作业", "Inventory Counting", "Tồn kho/kiểm kê"),
            ("MR130", "w_mr130", "材料庫存查詢作業", "MM", "1", 5.92, "0", "材料庫存查詢作業", "材料库存查询作业", "Inventory Query", "Tồn kho vật liệu"),
            ("MR135", "w_mr135", "材料進銷存報表", "MM", "1", 5.95, "0", "材料進銷存報表", "材料进销存报表", "Inventory Ledger", "Báo cáo tồn kho"),

            # 業務部門 (SA)
            ("SA", "", "業務部門管理系統", None, "0", 6.0, "0", "業務部門管理系統", "业务部门管理系统", "Sales Department System", "Quản lý kinh doanh"),
            ("SA001", "w_sa001", "訂單片語字庫", "SA", "1", 6.01, "0", "訂單片語字庫", "订单片语字库", "Sales Phrase Setup", "Từ điển đơn hàng"),
            ("SA005", "w_sa005", "訂單預算管理", "SA", "1", 6.05, "0", "訂單預算管理", "订单预算管理", "Order Budget Setup", "Ngân sách đơn hàng"),
            ("SA006", "w_sa006", "顏色設定", "SA", "1", 6.06, "0", "顏色設定", "颜色设定", "Sales Color Setup", "Màu sắc kinh doanh"),
            ("SA007", "w_sa007", "配件設定", "SA", "1", 6.07, "0", "配件設定", "配件设定", "Sales Accessory Setup", "Phụ kiện kinh doanh"),
            ("SA010", "w_sa010", "客戶資料管理", "SA", "1", 6.10, "0", "客戶資料管理", "客户资料管理", "Sales Customer Management", "Quản lý khách hàng"),

            ("SA015", "w_sa015", "訂單資料管理", "SA", "1", 6.15, "0", "訂單資料管理", "订单资料管理", "Order Entry Management", "Quản lý dữ liệu đơn hàng"),
            ("SA018", "w_sa018", "未結訂單餘額查詢", "SA", "1", 6.18, "0", "未結訂單餘額查詢", "未结订单余额查询", "Pending Order Balance", "Truy vấn số dư đơn hàng"),
            ("SA020", "w_sa020", "付款方式設定", "SA", "1", 6.20, "0", "付款方式設定", "付款方式设定", "Payment Method Setup", "Thiết lập phương thức thanh toán"),
            ("SA030", "w_sa030", "配額資料管理", "SA", "1", 6.30, "0", "配額資料管理", "配额资料管理", "Quota Management", "Quản lý hạn ngạch"),
            ("SA040", "w_sa040", "訂單報價管理", "SA", "1", 6.40, "0", "訂單報價管理", "订单报价管理", "Order Quotation", "Quản lý báo giá đơn hàng"),
            ("SA045", "w_sa045", "訂單審核管理", "SA", "1", 6.45, "0", "訂單審核管理", "订单审核管理", "Order Review", "Quản lý phê duyệt đơn hàng"),
            ("SA046", "w_sa046", "新鞋訂單樣品審核", "SA", "1", 6.46, "0", "新鞋訂單樣品審核", "新鞋订单样品审核", "New Style Sample Review", "Duyệt mẫu đơn hàng giày mới"),
            ("SA048", "w_sa048", "客戶配額查詢", "SA", "1", 6.48, "0", "客戶配額查詢", "客户配额查询", "Customer Quota Query", "Truy vấn hạn ngạch KH"),
            ("SA050", "w_sa050", "年度訂單結算", "SA", "1", 6.50, "0", "年度訂單結算", "年度订单结算", "Annual Order Settlement", "Quyết toán đơn hàng năm"),
            ("SA055", "w_sa055", "訂單數量綜合統計", "SA", "1", 6.55, "0", "訂單數量綜合統計", "订单数量综合统计", "Order Qty Statistics", "Thống kê tổng hợp số lượng đơn hàng"),
            ("SA058", "w_sa058", "樣品訂單統計", "SA", "1", 6.58, "0", "樣品訂單統計", "样品订单统计", "Sample Order Stat", "Thống kê đơn hàng mẫu"),
            ("SA060", "w_sa060", "出貨單狀態審核", "SA", "1", 6.60, "0", "出貨單狀態審核", "出货单状态审核", "Shipment Order Review", "Duyệt trạng thái phiếu xuất hàng"),
            ("SA065", "w_sa065", "出貨單資料管理", "SA", "1", 6.65, "0", "出貨單資料管理", "出货单资料管理", "Shipment Order Management", "Quản lý dữ liệu phiếu xuất hàng"),
            ("SA070", "w_sa070", "訂單餘額明細查詢", "SA", "1", 6.70, "0", "訂單餘額明細查詢", "订单余额明細查询", "Order Balance Detail", "Truy vấn chi tiết số dư đơn hàng"),
            ("SA075", "w_sa075", "訂單轉入 DP041 管理", "SA", "1", 6.75, "0", "訂單轉入 DP041 管理", "订单转入 DP041 管理", "Order Transfer to DP041", "Chuyển đơn hàng vào quản lý DP041"),
            ("SA080", "w_sa080", "訂單餘額統計", "SA", "1", 6.80, "0", "訂單餘額統計", "订单余额统计", "Order Balance Summary", "Thống kê số dư đơn hàng"),
            ("SA085", "w_sa085", "樣品成本核算", "SA", "1", 6.85, "0", "樣品成本核算", "样品成本核算", "Sales Sample Costing", "Tính giá thành mẫu kinh doanh"),
            ("SA090", "w_sa090", "樣品數量綜合統計", "SA", "1", 6.90, "0", "樣品數量綜合統計", "样品数量综合统计", "Sales Sample Stat", "Thống kê tổng hợp mẫu kinh doanh"),
            ("SA095", "w_sa095", "出貨單統計", "SA", "1", 6.95, "0", "出貨單統計", "出货单统计", "Shipment Statistics", "Thống kê phiếu xuất hàng"),
            ("SA096", "w_sa096", "訂單樣品狀態綜合查詢", "SA", "1", 6.96, "0", "訂單樣品狀態綜合查詢", "订单样品状态综合查询", "Order Sample Status Query", "Truy vấn tổng hợp trạng thái mẫu đơn hàng"),

            # QC, SH, FM, CC
            ("QC", "", "Q/C部門管理系統", None, "0", 7.0, "0", "Q/C部門管理系統", "Q/C部门管理系统", "QC Department System", "Hệ thống quản lý bộ phận QC"),
            ("SH", "", "船務部門管理系統", None, "0", 8.0, "0", "船務部門管理系統", "船务部门管理系统", "Shipping Department System", "Hệ thống quản lý bộ phận xuất nhập khẩu"),
            ("FM", "", "財務部門管理系統", None, "0", 9.0, "0", "財務部門管理系統", "财务部门管理系统", "Finance Department System", "Hệ thống quản lý tài chính"),
            ("CC", "", "電腦中心管理系統", None, "0", 10.0, "0", "電腦中心管理系統", "电脑中心管理系统", "Computer Center System", "Hệ thống quản lý trung tâm máy tính"),
        ]

        with connection.cursor() as cursor:
            # Seed sys_menu
            menu_count_inserted = 0
            for m in menus_to_seed:
                cursor.execute("SELECT count(*) FROM sys_menu WHERE prg_code = %s", (m[0],))
                if cursor.fetchone()[0] == 0:
                    cursor.execute("""
                        INSERT INTO sys_menu (
                            prg_code, obj_name, prg_name, parent_code, fram_class, 
                            prg_serialno, sysflag, chinesebigname, chinesesimpname, 
                            englishname, vietnamname
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, m)
                    menu_count_inserted += 1
            if menu_count_inserted > 0:
                self.stdout.write(self.style.SUCCESS(f"Seeded {menu_count_inserted} sys_menu rows."))
            else:
                self.stdout.write(self.style.SUCCESS("sys_menu table is already populated."))

            # Seed sys_popedom_desc
            actions = [
                ("search", "查詢", 4),
                ("new", "新增", 1),
                ("edit", "修改", 2),
                ("delete", "刪除", 3),
                ("print", "列印", 5),
                ("excel", "匯出", 6),
                ("check", "審核", 7),
                ("recheck", "反審", 8),
            ]
            desc_count_inserted = 0
            for m in menus_to_seed:
                if m[4] == "1" and m[1]:  # Leaf node with obj_name
                    obj_name = m[1]
                    for popedom_id, popedom_desc, popedom_index in actions:
                        cursor.execute("""
                            SELECT count(*) FROM sys_popedom_desc 
                            WHERE hisystem = '01' AND obj_name = %s AND popedom_id = %s
                        """, (obj_name, popedom_id))
                        if cursor.fetchone()[0] == 0:
                            cursor.execute("""
                                INSERT INTO sys_popedom_desc (
                                    hisystem, obj_name, popedom_id, popedom_desc, popedom_index
                                ) VALUES ('01', %s, %s, %s, %s)
                            """, (obj_name, popedom_id, popedom_desc, popedom_index))
                            desc_count_inserted += 1
            if desc_count_inserted > 0:
                self.stdout.write(self.style.SUCCESS(f"Seeded {desc_count_inserted} sys_popedom_desc rows."))
            else:
                self.stdout.write(self.style.SUCCESS("sys_popedom_desc table is already populated."))

            # Seed popedoms for user '001' (permissions for w_dp030 and w_dp040)
            popedoms_to_seed = [
                ("001", "w_dp030", "1111111111111", "1", "01"),
                ("001", "w_dp030", "1111111111111", "10", "01"),
                ("001", "w_dp040", "1111111111111", "1", "01"),
                ("001", "w_dp040", "1111111111111", "10", "01"),
            ]
            popedom_count_inserted = 0
            for accounts_id, obj_name, prg_popedom, flag, hisystem in popedoms_to_seed:
                cursor.execute("""
                    SELECT count(*) FROM sys_popedom 
                    WHERE accounts_id = %s AND obj_name = %s AND flag = %s AND hisystem = %s
                """, (accounts_id, obj_name, flag, hisystem))
                if cursor.fetchone()[0] == 0:
                    cursor.execute("""
                        INSERT INTO sys_popedom (
                            accounts_id, obj_name, prg_popedom, flag, hisystem
                        ) VALUES (%s, %s, %s, %s, %s)
                    """, (accounts_id, obj_name, prg_popedom, flag, hisystem))
                    popedom_count_inserted += 1
            if popedom_count_inserted > 0:
                self.stdout.write(self.style.SUCCESS(f"Seeded {popedom_count_inserted} sample sys_popedom rows for user '001'."))


        # 1. Create or update Django User
        user, created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created Django User: {username}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated Django User: {username}"))

        # 2. Create or update corresponding SysAccount
        sys_account = SysAccount.objects.filter(accounts_id=username).first()
        if sys_account:
            sys_account.accounts = display_name
            sys_account.user_pwd = password  # for legacy plain text auth compatibility
            sys_account.peopdom_class = "5"
            sys_account.status_sign = "0"
            sys_account.save()
            self.stdout.write(self.style.SUCCESS(f"Updated SysAccount: {username}"))
        else:
            new_gkey = generate_pb_gkey()
            new_user_id = generate_pb_gkey() # employee gkey
            sys_account = SysAccount.objects.create(
                gkey=new_gkey,
                hisystem="01",
                accounts_id=username,
                user_id=new_user_id,
                accounts=display_name,
                user_pwd=password,
                peopdom_class="5",
                status_sign="0"
            )
            self.stdout.write(self.style.SUCCESS(f"Created SysAccount: {username}"))
