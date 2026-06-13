from django.db import transaction
from api.models import Dp030, Dp031, Dp033

def get_sample_status_mode():
    """
    獲取樣品結案判定模式。
    """
    try:
        from api.services.sys_parameter_cache import SysParameterCache
        mode = SysParameterCache.get_parameter('00', 'samplestatus')
        if mode:
            return mode
    except Exception:
        pass
    return '1'

def recalculate_sample_status(dp030_keys=None, dp031_keys=None, dp033_keys=None):
    """
    共用樣品單與配色生命週期狀態計算引擎
    """
    resolved_dp031_keys = set()
    resolved_dp030_keys = set()

    # 1. 解析受影響的外鍵關係，去重並忽略 None
    if dp033_keys:
        for d33 in Dp033.objects.filter(pk__in=dp033_keys):
            if d33.dp031gkey_id:
                resolved_dp031_keys.add(d33.dp031gkey_id)
            if d33.dp030gkey_id:
                resolved_dp030_keys.add(d33.dp030gkey_id)
            
    if dp031_keys:
        for d31_key in dp031_keys:
            if not d31_key:
                continue
            resolved_dp031_keys.add(d31_key)
            try:
                d31 = Dp031.objects.get(pk=d31_key)
                if d31.dp030gkey_id:
                    resolved_dp030_keys.add(d31.dp030gkey_id)
            except Dp031.DoesNotExist:
                pass
                
    if dp030_keys:
        for d30_key in dp030_keys:
            if d30_key:
                resolved_dp030_keys.add(d30_key)

    samplestatus = get_sample_status_mode()

    with transaction.atomic():
        # 2. 更新配色明細 dp031.status
        for d31_key in resolved_dp031_keys:
            if not d31_key:
                continue
            try:
                d31 = Dp031.objects.select_for_update().get(pk=d31_key)
                if d31.status == '0':
                    continue  # 排除作廢配色，不可修改其狀態
                
                sizes = Dp033.objects.filter(dp031gkey=d31_key)
                if not sizes.exists():
                    # 如果沒有尺碼資料，預設為未完 (進行中)
                    if d31.status != '1':
                        d31.status = '1'
                        d31.save()
                    continue

                all_sizes_completed = True
                any_size_sent = False

                for s in sizes:
                    sent = float(s.sentpairs or 0)
                    cust = float(s.custpairs or 0)
                    keep = float(s.keeppairs or 0)
                    rec = float(s.receive or 0)

                    is_completed = False
                    if samplestatus == '1':
                        is_completed = (sent >= cust + keep)
                    elif samplestatus == '2':
                        is_completed = (sent >= cust and rec >= keep)
                    elif samplestatus == '3':
                        is_completed = (sent + rec >= cust + keep)
                    else:
                        is_completed = (sent >= cust)

                    if not is_completed:
                        all_sizes_completed = False
                    
                    if samplestatus == '3':
                        if sent + rec > 0:
                            any_size_sent = True
                    else:
                        if sent > 0:
                            any_size_sent = True

                new_status = '1'
                if all_sizes_completed:
                    new_status = '3'
                elif any_size_sent:
                    new_status = '2'

                if d31.status != new_status:
                    d31.status = new_status
                    d31.save()
                
                if d31.dp030gkey_id:
                    resolved_dp030_keys.add(d31.dp030gkey_id)
            except Dp031.DoesNotExist:
                pass

        # 3. 更新樣品單主檔 dp030.status
        for d30_key in resolved_dp030_keys:
            if not d30_key:
                continue
            try:
                d30 = Dp030.objects.select_for_update().get(pk=d30_key)
                if d30.status == '0':
                    continue  # 排除作廢主單，不可修改其狀態
                
                colors = Dp031.objects.filter(dp030gkey=d30_key)
                active_colors = colors.exclude(status='0')

                if not active_colors.exists():
                    if d30.status != '1':
                        d30.status = '1'
                        d30.save()
                    continue

                all_colors_completed = all(c.status == '3' for c in active_colors)
                any_color_sent = any(c.status in ['2', '3'] for c in active_colors)

                new_status = '1'
                if all_colors_completed:
                    new_status = '3'
                elif any_color_sent:
                    new_status = '2'

                if d30.status != new_status:
                    d30.status = new_status
                    d30.save()
            except Dp030.DoesNotExist:
                pass

def calculate_dp033_outstanding(dp033_instance, samplestatus_mode=None):
    """
    計算特定尺碼 (DP033) 的未交量 (Outstanding)。
    基於 DP032 Outstanding Sample List 與 DP040 import_candidates 邏輯。
    """
    from decimal import Decimal
    if samplestatus_mode is None:
        samplestatus_mode = get_sample_status_mode()
        
    custpairs = dp033_instance.custpairs or Decimal('0')
    keeppairs = dp033_instance.keeppairs or Decimal('0')
    sentpairs = dp033_instance.sentpairs or Decimal('0')
    receive = dp033_instance.receive or Decimal('0')
    
    if samplestatus_mode in ['1', '2']:
        if samplestatus_mode == '2':
            outstanding = custpairs - sentpairs
        else:
            outstanding = (custpairs + keeppairs) - sentpairs
    elif samplestatus_mode == '3':
        outstanding = (custpairs + keeppairs - receive) - sentpairs
    else:
        outstanding = custpairs - sentpairs
        
    return max(outstanding, Decimal('0'))

