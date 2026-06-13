from decimal import Decimal, InvalidOperation
from django.utils import timezone as tz_utils

def _dp055_to_decimal(value, default="0") -> Decimal:
    """安全轉換為 Decimal。None / '' / 非數值均回傳 default。"""
    if value is None or value == "":
        return Decimal(default)
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return Decimal(default)

def get_cost_parameter() -> Decimal:
    """
    取得系統預設損耗率 (CostParameter)，單位為百分比（如 2 代表 2%）。

    TODO: 從系統參數表（SysParam / 系統設定模組）讀取 CostParameter。
          目前 hardcode 為 2。待系統設定模組對接後，替換此 return。
    """
    return Decimal("2")

def get_nutax_parameter() -> Decimal:
    """
    取得未稅比率 (NutaxParameter)，如 0.83 代表未稅成本 = 稅前成本 × 0.83。

    TODO: 從系統參數表（SysParam / 系統設定模組）讀取 NutaxParameter。
          目前 hardcode 為 0.83。待系統設定模組對接後，替換此 return。
    """
    return Decimal("0.83")

def _recalculate_dp032_row(row, color_index: int, nutax_rate: Decimal) -> dict:
    """
    重新計算 dp032 某一行某配色 N 的衍生成本欄位，回傳需要 update 的欄位 dict。

    公式：
        grossyieldN = yieldN × (1 + lossN / 100)
        totalcostN  = grossyieldN × costN
        nutaxN      = totalcostN × nutax_rate
    """
    n = color_index
    y = _dp055_to_decimal(getattr(row, f'yield{n}', 0))
    l = _dp055_to_decimal(getattr(row, f'loss{n}', 0))
    c = _dp055_to_decimal(getattr(row, f'cost{n}', 0))
    gross = y * (1 + l / 100)
    total = gross * c
    nutax = total * nutax_rate
    return {
        f'grossyield{n}': gross.quantize(Decimal("0.0001")),
        f'totalcost{n}': total.quantize(Decimal("0.0001")),
        f'nutax{n}': nutax.quantize(Decimal("0.0001")),
    }

def _recalculate_total_fob(wagescost, managecost, profit, colors, bom_rows) -> Decimal:
    """
    計算 totalfob。

    公式：
        lop      = wagescost + managecost + profit
        totalfob = lop + Σ (totalcostN / exrateN)  for each chk='Y' color N

    注意：
    - 只計算 dp031.chk = 'Y' 的配色 serialno。
    - 若沒有任何 chk='Y'，暫以 serialno=1 計算，避免 totalfob=0。
      TODO: 確認 PB 原始行為，無打勾配色時是否允許核算。
    - exrateN 為 0 或 None 時，強制視為 1，避免除以 0。
    """
    lop = _dp055_to_decimal(wagescost) + _dp055_to_decimal(managecost) + _dp055_to_decimal(profit)

    chk_serials = [c.serialno for c in colors if c.chk == 'Y']
    if not chk_serials:
        # TODO: 確認 PB 無打勾配色時的正確行為，暫以 serialno=1 計算
        chk_serials = [1]

    material_sum = Decimal("0")
    for row in bom_rows:
        for n in chk_serials:
            total = _dp055_to_decimal(getattr(row, f'totalcost{n}', 0))
            exrate = _dp055_to_decimal(getattr(row, f'exrate{n}', 1), "1")
            if exrate == Decimal("0"):
                exrate = Decimal("1")
            material_sum += total / exrate

    return (lop + material_sum).quantize(Decimal("0.0001"))

def _build_workbench_response(dp030_obj) -> dict:
    """
    組裝 retrieve_workbench / import_sample / save_costing 的統一回傳結構。

    欄位 Mapping 注意事項：
        response['master']['ba060gkey'] ← dp030.aba060gkey
        (DP055 API field "ba060gkey" maps to legacy dp030.aba060gkey.
         Do NOT create dp030.ba060gkey. See implementation_plan.md for rationale.)
    """
    colors = list(dp030_obj.details_dp031.order_by('serialno'))
    bom_rows = list(dp030_obj.details_dp032.order_by('serialno'))

    master = {
        "gkey": dp030_obj.gkey,
        "sampleno": dp030_obj.sampleno,
        "styleno": dp030_obj.styleno or "",
        "stylename": dp030_obj.stylename or "",
        "year": dp030_obj.year or "",
        "status": dp030_obj.status or "",
        "cost": dp030_obj.cost or "N",
        "costdate": dp030_obj.costdate.isoformat() if dp030_obj.costdate else None,
        "wagescost": str(dp030_obj.wagescost or 0),
        "managecost": str(dp030_obj.managecost or 0),
        "profit": str(dp030_obj.profit or 0),
        "lop": str(dp030_obj.lop or 0),
        "totalfob": str(dp030_obj.totalfob or 0),
        "costremark": dp030_obj.costremark or "",
        "capprove": dp030_obj.capprove or "N",
        # DP055 API field "ba060gkey" maps to legacy dp030.aba060gkey.
        # Do NOT create dp030.ba060gkey.
        "ba060gkey": dp030_obj.aba060gkey_id,
    }

    colors_data = []
    for c in colors:
        colors_data.append({
            "gkey": c.gkey,
            "dp030gkey": c.dp030gkey_id,
            "serialno": c.serialno,
            "colorno": c.colorcode or "",
            "cname": c.color or "",
            "ename": c.ecolor or "",
            "totalpairs": str(c.totalpairs or 0),
            "chk": c.chk or "N",
            "photopath": c.photopath or "",
        })

    bom_data = []
    for row in bom_rows:
        bom_data.append({
            "gkey": row.gkey,
            "dp030gkey": row.dp030gkey_id,
            "serialno": row.serialno,
            "parts": row.parts or "",
            "eparts": row.eparts or "",
            "qprp": str(row.qprp or 0),
            # Color 1
            "cost1": str(row.cost1 or 0),
            "yield1": str(row.yield1 or 0),
            "loss1": str(row.loss1 or 0),
            "grossyield1": str(row.grossyield1 or 0),
            "totalcost1": str(row.totalcost1 or 0),
            "nutax1": str(row.nutax1 or 0),
            "exrate1": str(row.exrate1 or 1),
            "uom1": row.uom1 or "",
            # Color 2
            "cost2": str(row.cost2 or 0),
            "yield2": str(row.yield2 or 0),
            "loss2": str(row.loss2 or 0),
            "grossyield2": str(row.grossyield2 or 0),
            "totalcost2": str(row.totalcost2 or 0),
            "nutax2": str(row.nutax2 or 0),
            "exrate2": str(row.exrate2 or 1),
            "uom2": row.uom2 or "",
            # Color 3
            "cost3": str(row.cost3 or 0),
            "yield3": str(row.yield3 or 0),
            "loss3": str(row.loss3 or 0),
            "grossyield3": str(row.grossyield3 or 0),
            "totalcost3": str(row.totalcost3 or 0),
            "nutax3": str(row.nutax3 or 0),
            "exrate3": str(row.exrate3 or 1),
            "uom3": row.uom3 or "",
            # Color 4
            "cost4": str(row.cost4 or 0),
            "yield4": str(row.yield4 or 0),
            "loss4": str(row.loss4 or 0),
            "grossyield4": str(row.grossyield4 or 0),
            "totalcost4": str(row.totalcost4 or 0),
            "nutax4": str(row.nutax4 or 0),
            "exrate4": str(row.exrate4 or 1),
            "uom4": row.uom4 or "",
        })

    return {
        "master": master,
        "colors": colors_data,
        "bom_details": bom_data,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Dp055ViewSet
# ─────────────────────────────────────────────────────────────────────────────

