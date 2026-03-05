<template>
  <div class="bi-reports p-10 space-y-8">
    <el-row :gutter="24">
      <!-- 财务报表导出 -->
      <el-col :span="12">
        <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <template #header><span class="text-xl font-black tracking-tight">财务对账报表</span></template>
          <div class="report-box">
            <el-form label-width="80px">
              <el-form-item label="日期范围">
                <el-date-picker v-model="dateRangeFinance" type="daterange" class="w-full" />
              </el-form-item>
              <el-form-item label="报表类型">
                <el-radio-group v-model="reportType">
                  <el-radio label="order">订单流水总表</el-radio>
                  <el-radio label="settle">师傅结算明细</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-button type="primary" block @click="exportReport('finance')">生成并导出 CSV 报表</el-button>
            </el-form>
          </div>
        </el-card>
      </el-col>

      <!-- 运营指标分析 -->
      <el-col :span="12">
        <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <template #header><span class="text-xl font-black tracking-tight">运营增长看板</span></template>
          <div class="growth-stats">
            <div class="stat-mini">
              <div class="label">本周单量增长</div>
              <div class="val text-green">+12.5%</div>
            </div>
            <div class="stat-mini">
              <div class="label">平均客单价</div>
              <div class="val">¥ 158.40</div>
            </div>
            <el-button type="success" plain block @click="exportReport('growth')" class="mt-20">导出用户留存分析表</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 说明提示 -->
    <el-alert
      title="BI中心数据每小时更新一次缓存，导出的报表包含：交易明细、平台佣金、支付手续费及税务预留项。"
      type="info"
      show-icon
      class="mt-6"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const dateRangeFinance = ref([])
const reportType = ref('order')

const exportReport = (type) => {
  ElMessage.success({
    message: `正在构建 ${type === 'finance' ? '财务对账' : '运营增长'} 深度数据模型...`,
    duration: 2000
  })
  
  setTimeout(() => {
    // 1. 模拟生成 CSV 内容 (实际开发中可以从 stats 变量或接口获取)
    let csvContent = "\ufeff"; // 增加 BOM 头，防止 Excel 打开乱码
    if (type === 'finance') {
      csvContent += "订单号,服务项目,成交金额,平台抽成,师傅收入,支付时间\n";
      csvContent += "ORD20260119001,专业陪诊,198.00,19.80,178.20,2026-01-19 14:20:01\n";
      csvContent += "ORD20260119002,上门做饭,150.00,22.50,127.50,2026-01-19 15:10:22\n";
    } else {
      csvContent += "日期,新增用户,活跃人数,成交订单量,GMV\n";
      csvContent += "2026-01-18,15,42,28,4580.00\n";
      csvContent += "2026-01-19,21,56,35,6210.00\n";
    }

    // 2. 创建 Blob 对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 3. 物理触发浏览器下载
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `小帮手_${type === 'finance' ? '财务报表' : '增长分析'}_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    ElMessage.success('报表生成成功，已下发至您的下载文件夹');
  }, 1500)
}
</script>

<style scoped>
.bi-reports { background: transparent; }
.report-box { padding: 10px 0; }
.stat-mini { margin-bottom: 20px; }
.stat-mini .label { font-size: 13px; color: #94a3b8; }
.stat-mini .val { font-size: 28px; font-weight: 800; color: #0f172a; }
.mt-20 { margin-top: 20px; }
.text-green { color: #16a34a; }
</style>
