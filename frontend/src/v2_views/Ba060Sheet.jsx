import createMasterDetailSheet from '../components/erp/factory/createMasterDetailSheet';
import dayjs from 'dayjs';

export default createMasterDetailSheet({
  sheetId: 'ba060',
  title: '全域幣別與匯率設定',
  breadcrumb: ['基本資料管理', '全域幣別與匯率設定'],

  master: {
    apiUrl: 'http://localhost:8001/api/ba060/',
    key: 'gkey',
    columns: [
      {
        key: 'currencyno',
        label: '幣別代號',
        width: '120px',
        editable: true,
        type: 'text',
        maxLength: 10,
        required: true,
        textTransform: 'uppercase'
      },
      {
        key: 'currency',
        label: '幣別中文名稱',
        width: '220px',
        editable: true,
        type: 'text',
        maxLength: 20,
        required: true
      },
      {
        key: 'exrate',
        label: '當前匯率',
        width: '130px',
        editable: false,
        type: 'number',
        precision: 4
      }
    ],
    createDefaultRow: (tempGkey) => ({
      gkey: tempGkey,
      currencyno: '',
      currency: '',
      exrate: null
    }),
    buildPayload: (row) => {
      if (!row.currencyno || !row.currency) {
        throw new Error('請填寫完整幣別代號與名稱');
      }
      return {
        currencyno: row.currencyno.toUpperCase(),
        currency: row.currency,
        exrate: row.exrate
      };
    },
    getDisplayText: (row) => `${row.currencyno} (${row.currency})`
  },

  detail: {
    apiUrl: 'http://localhost:8001/api/ba061/',
    key: 'gkey',
    parentKey: 'ba060gkey',
    columns: [
      {
        key: 'rate',
        label: '基準匯率值',
        width: '140px',
        editable: true,
        type: 'number',
        precision: 4,
        required: true
      },
      {
        key: 'effectivedate',
        label: '生效日期',
        width: '190px',
        editable: true,
        type: 'datetime',
        required: true
      },
      {
        key: 'losectivedate',
        label: '失效日期',
        width: '190px',
        editable: true,
        type: 'datetime',
        required: true
      },
      {
        key: 'chk',
        label: '當前啟用',
        width: '90px',
        editable: true,
        type: 'switch',
        required: true,
        options: {
          checkedValue: 'Y',
          unCheckedValue: 'N'
        }
      }
    ],
    createDefaultRow: (tempGkey, parentGkey) => ({
      gkey: tempGkey,
      ba060gkey: parentGkey,
      rate: 1,
      effectivedate: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      losectivedate: dayjs().add(1, 'year').format('YYYY-MM-DDTHH:mm:ss'),
      chk: 'N'
    }),
    buildPayload: (row) => {
      if (row.rate === undefined || row.rate === null || row.rate === '') {
        throw new Error('基準匯率值為必填項目');
      }
      if (isNaN(Number(row.rate))) {
        throw new Error('基準匯率值必須為數字');
      }
      if (!row.effectivedate || !row.losectivedate) {
        throw new Error('生效日期與失效日期皆為必填');
      }
      if (dayjs(row.losectivedate).isBefore(dayjs(row.effectivedate))) {
        throw new Error('失效日期不可早於生效日期！');
      }
      return {
        ba060gkey: row.ba060gkey,
        rate: Number(row.rate),
        effectivedate: dayjs(row.effectivedate).toISOString(),
        losectivedate: dayjs(row.losectivedate).toISOString(),
        chk: row.chk === 'Y' ? 'Y' : 'N'
      };
    },
    getDisplayText: (row) => `匯率: ${row.rate}`
  },

  fieldLabels: {
    currencyno: '幣別代號',
    currency: '幣別中文名稱',
    exrate: '當前匯率',
    rate: '基準匯率值',
    effectivedate: '生效日期',
    losectivedate: '失效日期',
    chk: '啟用狀態',
    ba060gkey: '所屬幣別'
  },
  cascadeDeleteDetailOnMasterDelete: true,

  validateAll: ({ detailRows, deletedDetailKeys }) => {
    const containsKey = (collection, key) => {
      if (!collection) return false;
      if (collection instanceof Set) return collection.has(key);
      if (Array.isArray(collection)) return collection.includes(key);
      return false;
    };

    const activeDetails = detailRows.filter(row => {
      return !containsKey(deletedDetailKeys, row.gkey);
    });
    
    // 檢查生效/失效時間邏輯
    activeDetails.forEach(row => {
      if (row.effectivedate && row.losectivedate) {
        if (dayjs(row.losectivedate).isBefore(dayjs(row.effectivedate))) {
          throw new Error('失效日期不可早於生效日期！');
        }
      }
    });
  }
});
