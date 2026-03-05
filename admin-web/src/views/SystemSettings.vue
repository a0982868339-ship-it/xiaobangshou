<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">全局策略控制台</div>
            <div class="text-sm text-slate-500 font-medium">系统配置与策略参数</div>
          </div>
          <el-button type="primary" @click="handleAdd">添加新策略项</el-button>
        </div>
      </template>

      <el-alert
        title="此处配置直接决定 App 的运行行为，请务必在专业人员指导下修改敏感参数。"
        type="warning"
        show-icon
        class="mb-6"
      />

    <!-- 分类分组显示配置 -->
    <el-collapse v-model="activeNames">
      <!-- 财务结算 -->
      <el-collapse-item name="finance">
        <template #title>
          <div class="flex items-center gap-2 text-slate-700 font-semibold">
            <el-icon><CreditCard /></el-icon>
            <span>财务结算 (Finance)</span>
          </div>
        </template>
        <el-table :data="financeConfigs" border stripe>
          <el-table-column prop="config_key" label="配置键名" width="220">
            <template #default="{ row }"><span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase">{{ row.config_key }}</span></template>
          </el-table-column>
          <el-table-column prop="config_value" label="配置数值">
            <template #default="{ row }">
              <el-input v-model="row.config_value" />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述">
            <template #default="{ row }">
              <span class="text-sm text-slate-600">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="saveConfig(row)">生效</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>

      <!-- 订单调度 -->
      <el-collapse-item name="order">
        <template #title>
          <div class="flex items-center gap-2 text-slate-700 font-semibold">
            <el-icon><Box /></el-icon>
            <span>订单调度 (Order Logic)</span>
          </div>
        </template>
        <el-table :data="orderConfigs" border stripe>
          <el-table-column prop="config_key" label="配置键名" width="220">
            <template #default="{ row }"><span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase">{{ row.config_key }}</span></template>
          </el-table-column>
          <el-table-column prop="config_value" label="配置数值">
            <template #default="{ row }">
              <el-input v-model="row.config_value" />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述">
            <template #default="{ row }">
              <span class="text-sm text-slate-600">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="saveConfig(row)">生效</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>

      <!-- 信用风控 -->
      <el-collapse-item name="credit">
        <template #title>
          <div class="flex items-center gap-2 text-slate-700 font-semibold">
            <el-icon><Checked /></el-icon>
            <span>信用风控 (Credit & Risk)</span>
          </div>
        </template>
        <el-table :data="creditConfigs" border stripe>
          <el-table-column prop="config_key" label="配置键名" width="220">
            <template #default="{ row }"><span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase">{{ row.config_key }}</span></template>
          </el-table-column>
          <el-table-column prop="config_value" label="配置数值">
            <template #default="{ row }">
              <el-input v-model="row.config_value" />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述">
            <template #default="{ row }">
              <span class="text-sm text-slate-600">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="saveConfig(row)">生效</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>

      <!-- 营销与公告 -->
      <el-collapse-item name="marketing">
        <template #title>
          <div class="flex items-center gap-2 text-slate-700 font-semibold">
            <el-icon><Picture /></el-icon>
            <span>营销与公告 (Marketing)</span>
          </div>
        </template>
        <el-table :data="marketingConfigs" border stripe>
          <el-table-column prop="config_key" label="配置键名" width="220" />
          <el-table-column prop="config_value" label="配置数值">
            <template #default="{ row }">
              <el-input v-model="row.config_value" type="textarea" autosize />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述">
            <template #default="{ row }">
              <span class="text-sm text-slate-600">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="saveConfig(row)">生效</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>

      <!-- 第三方集成 -->
      <el-collapse-item name="third-party">
        <template #title>
          <div class="flex items-center gap-2 text-slate-700 font-semibold">
            <el-icon><Connection /></el-icon>
            <span>第三方集成 (Third-party)</span>
          </div>
        </template>
        <el-table :data="thirdPartyConfigs" border stripe>
          <el-table-column prop="config_key" label="配置键名" width="220">
            <template #default="{ row }"><span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase">{{ row.config_key }}</span></template>
          </el-table-column>
          <el-table-column prop="config_value" label="配置数值">
            <template #default="{ row }">
              <el-input 
                v-model="row.config_value" 
                :type="row.config_key.includes('SECRET') || row.config_key.includes('KEY') ? 'password' : 'text'" 
                show-password
              />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述">
            <template #default="{ row }">
              <span class="text-sm text-slate-600">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="saveConfig(row)">生效</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>

      <!-- 基础配置 -->
      <el-collapse-item name="system">
        <template #title>
          <div class="flex items-center gap-2 text-slate-700 font-semibold">
            <el-icon><Operation /></el-icon>
            <span>基础配置 (System)</span>
          </div>
        </template>
        <el-table :data="systemConfigs" border stripe>
          <el-table-column prop="config_key" label="配置键名" width="220" />
          <el-table-column prop="config_value" label="配置数值">
            <template #default="{ row }">
              <el-input v-model="row.config_value" />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="功能描述">
            <template #default="{ row }">
              <span class="text-sm text-slate-600">{{ row.description }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button type="success" size="small" @click="saveConfig(row)">生效</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
    </el-card>

    <!-- 新增配置对话框 -->
    <el-dialog v-model="dialogVisible" title="指令注入 (New Config)" width="400px">
      <el-form :model="addForm" label-width="80px" class="space-y-2">
        <el-form-item label="配置键名" required>
          <el-input v-model="addForm.key" placeholder="如：MIN_WITHDRAW_AMOUNT" />
        </el-form-item>
        <el-form-item label="配置数值" required>
          <el-input v-model="addForm.value" />
        </el-form-item>
        <el-form-item label="功能说明">
          <el-input v-model="addForm.description" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">生效</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import { CreditCard, Box, Checked, Picture, Operation, Connection } from '@element-plus/icons-vue'

const configs = ref([])
const activeNames = ref(['finance', 'order', 'credit', 'marketing', 'third-party', 'system'])
const dialogVisible = ref(false)
const addForm = ref({ key: '', value: '', description: '' })

// 统一分类逻辑
const financeKeys = ['MIN_WITHDRAW_AMOUNT', 'WITHDRAW_FEE_RATE', 'SETTLE_DELAY_REGULAR', 'DEFAULT_COMMISSION_RATE']
const orderKeys = ['ORDER_AUTO_CANCEL_MINUTES', 'ORDER_SEARCH_RADIUS_KM', 'PROVIDER_MAX_CONCURRENT_ORDERS', 'INGREDIENT_BUYING_FEE_PER_DISH']
const creditKeys = ['CREDIT_DEFAULT_SCORE', 'CREDIT_ORDER_COMPLETED', 'CREDIT_PROVIDER_CANCEL', 'CREDIT_BAD_RATING', 'CREDIT_MIN_ACCEPT_SCORE', 'PROVIDER_DEPOSIT_AMOUNT', 'ENABLE_GPS_TRACKING', 'COMPLAINT_SLA_HOURS']
const marketingKeys = ['INVITE_USER_REWARD', 'INVITE_PROVIDER_REWARD', 'HOME_NOTICE_BAR', 'BANNER']
const thirdPartyKeys = [
  'AMAP_KEY_WEB', 'AMAP_KEY_SERVER', 'AMAP_FALCON_SID',
  'TENCENT_IM_SDKAPPID', 'TENCENT_IM_SECRET',
  'ALIPAY_APP_ID', 'ALIPAY_PRIVATE_KEY', 'ALIPAY_PUBLIC_KEY',
  'ID_VERIFY_APP_ID', 'ID_VERIFY_SECRET',
  'FACE_RECOGNITION_KEY',
  'ALIYUN_SMS_KEY', 'ALIYUN_SMS_SECRET',
  'OSS_ENDPOINT', 'OSS_BUCKET', 'OSS_KEY', 'OSS_SECRET'
]

const financeConfigs = computed(() => configs.value.filter(c => financeKeys.includes(c.config_key)))
const orderConfigs = computed(() => configs.value.filter(c => orderKeys.includes(c.config_key)))
const creditConfigs = computed(() => configs.value.filter(c => creditKeys.includes(c.config_key) || (c.config_key && c.config_key.startsWith('CREDIT_'))))
const marketingConfigs = computed(() => configs.value.filter(c => marketingKeys.includes(c.config_key) || (c.config_key && (c.config_key.includes('BANNER') || c.config_key.includes('NOTICE') || c.config_key.startsWith('INVITE_')))))
const thirdPartyConfigs = computed(() => configs.value.filter(c => thirdPartyKeys.includes(c.config_key) || c.config_key.includes('_KEY') || c.config_key.includes('_SECRET') || c.config_key.startsWith('ALIPAY_')))
const systemConfigs = computed(() => {
  const allCategorizedKeys = [...financeKeys, ...orderKeys, ...creditKeys, ...marketingKeys, ...thirdPartyKeys]
  return configs.value.filter(c => {
    const key = c.config_key
    if (!key) return true
    if (allCategorizedKeys.includes(key)) return false
    if (key.startsWith('CREDIT_') || key.startsWith('INVITE_') || key.includes('BANNER') || key.includes('NOTICE') || key.includes('_KEY') || key.includes('_SECRET') || key.startsWith('ALIPAY_')) return false
    return true
  })
})

const isInitializing = ref(false)

const loadConfigs = async () => {
  if (isInitializing.value) return
  try {
    const res = await request.get('/system/admin/configs')
    configs.value = res || []
    
    // 如果数据库是空的且没有正在初始化，预置几个常用的
    if (configs.value.length === 0) {
      await preseedConfigs()
    } else {
      // 检查是否缺失关键配置，如果是则静默补全，但不递归调用
      const keys = configs.value.map(c => c.config_key);
      const allSeeds = [
        { key: 'MIN_WITHDRAW_AMOUNT', value: '100', description: '服务者单次提现最低金额要求' },
        { key: 'WITHDRAW_FEE_RATE', value: '0.006', description: '提现手续费比例 (0.006 = 0.6%)' },
        { key: 'SETTLE_DELAY_REGULAR', value: '24', description: '常规结算账期（小时）' },
        { key: 'DEFAULT_COMMISSION_RATE', value: '10', description: '平台默认抽成比例 (%)' },
        { key: 'ORDER_AUTO_CANCEL_MINUTES', value: '15', description: '未支付订单自动取消时长' },
        { key: 'ORDER_SEARCH_RADIUS_KM', value: '10', description: '接单大厅默认派单搜索半径' },
        { key: 'PROVIDER_MAX_CONCURRENT_ORDERS', value: '3', description: '服务者同时接单上限' },
        { key: 'INGREDIENT_BUYING_FEE_PER_DISH', value: '5', description: '代买食材服务费（按菜品道数计费）' },
        { key: 'PROVIDER_DEPOSIT_AMOUNT', value: '500', description: '服务者标准保证金' },
        { key: 'ENABLE_GPS_TRACKING', value: '1', description: '开启服务过程 GPS 采集 (1-开, 0-关)' },
        { key: 'COMPLAINT_SLA_HOURS', value: '24', description: '官方介入投诉处理时效' },
        { key: 'INVITE_USER_REWARD', value: '10', description: '邀请新用户奖励金额' },
        { key: 'INVITE_PROVIDER_REWARD', value: '50', description: '成功邀请服务者入驻奖励' },
        { key: 'APP_VERSION_USER', value: '1.0.5', description: '当前用户端版本号（控制强更）' },
        { key: 'CUSTOMER_SERVICE_PHONE', value: '400-123-4567', description: '全平台统一客服热线' },
        { key: 'HOME_NOTICE_BAR', value: '欢迎使用小帮手！今日陪诊单量爆棚，请各位师傅积极接单。', description: '客户端首页跑马灯通知内容' },
        { key: 'CREDIT_DEFAULT_SCORE', value: '100', description: '新服务者初始信用分' },
        { key: 'CREDIT_ORDER_COMPLETED', value: '1', description: '完成一单奖励分值' },
        { key: 'CREDIT_PROVIDER_CANCEL', value: '-10', description: '服务者取消订单扣除分值' },
        { key: 'CREDIT_BAD_RATING', value: '-5', description: '收到用户差评扣除分值' },
        { key: 'CREDIT_MIN_ACCEPT_SCORE', value: '60', description: '允许接单的最低信用分' },
        { key: 'AMAP_KEY_WEB', value: '', description: '高德地图 Web 端 Key' },
        { key: 'AMAP_KEY_SERVER', value: '', description: '高德地图服务端 Key' },
        { key: 'AMAP_FALCON_SID', value: '', description: '高德猎鹰轨迹服务 SID (Service ID)' },
        { key: 'TENCENT_IM_SDKAPPID', value: '', description: '腾讯云 IM SDKAppID' },
        { key: 'TENCENT_IM_SECRET', value: '', description: '腾讯云 IM 密钥' },
        { key: 'ALIPAY_APP_ID', value: '', description: '支付宝开放平台 APPID' },
        { key: 'ALIPAY_PRIVATE_KEY', value: '', description: '支付宝商户私钥' },
        { key: 'ALIPAY_PUBLIC_KEY', value: '', description: '支付宝平台公钥' },
        { key: 'ALIYUN_SMS_KEY', value: '', description: '阿里云短信 AccessKey' },
        { key: 'ALIYUN_SMS_SECRET', value: '', description: '阿里云短信 AccessSecret' },
        { key: 'OSS_BUCKET', value: '', description: '对象存储 Bucket 名称' },
        { key: 'ID_VERIFY_APP_ID', value: '', description: '实名认证接口 APPID' },
        { key: 'FACE_RECOGNITION_KEY', value: '', description: '人脸识别接口 Key' },
        { key: 'FACE_RECOGNITION_SECRET', value: '', description: '人脸识别接口 Secret' }
      ];
      
      const missingSeeds = allSeeds.filter(s => !keys.includes(s.key));
      if (missingSeeds.length > 0) {
        isInitializing.value = true
        // 串行补全，避免触发频控
        for (const s of missingSeeds) {
          try {
            await request.post('/system/admin/configs', s);
          } catch (err) {
            console.error('补全配置失败:', s.key);
          }
        }
        isInitializing.value = false
        // 全部补全后只刷新一次
        const finalRes = await request.get('/system/admin/configs')
        configs.value = finalRes || []
      }
    }
  } catch (e) {
    console.error('加载配置失败:', e)
  }
}

const preseedConfigs = async () => {
  if (isInitializing.value) return
  isInitializing.value = true
  const seeds = [
    { key: 'MIN_WITHDRAW_AMOUNT', value: '100', description: '服务者单次提现最低金额要求' },
    { key: 'WITHDRAW_FEE_RATE', value: '0.006', description: '提现手续费比例 (0.006 = 0.6%)' },
    { key: 'SETTLE_DELAY_REGULAR', value: '24', description: '常规结算账期（小时）' },
    { key: 'DEFAULT_COMMISSION_RATE', value: '10', description: '平台默认抽成比例 (%)' },
    { key: 'ORDER_AUTO_CANCEL_MINUTES', value: '15', description: '未支付订单自动取消时长' },
    { key: 'ORDER_SEARCH_RADIUS_KM', value: '10', description: '接单大厅默认派单搜索半径' },
    { key: 'PROVIDER_MAX_CONCURRENT_ORDERS', value: '3', description: '服务者同时接单上限' },
    { key: 'INGREDIENT_BUYING_FEE_PER_DISH', value: '5', description: '代买食材服务费（按菜品道数计费）' },
    { key: 'PROVIDER_DEPOSIT_AMOUNT', value: '500', description: '服务者标准保证金' },
    { key: 'ENABLE_GPS_TRACKING', value: '1', description: '开启服务过程 GPS 采集 (1-开, 0-关)' },
    { key: 'COMPLAINT_SLA_HOURS', value: '24', description: '官方介入投诉处理时效' },
    { key: 'INVITE_USER_REWARD', value: '10', description: '邀请新用户奖励金额' },
    { key: 'INVITE_PROVIDER_REWARD', value: '50', description: '成功邀请服务者入驻奖励' },
    { key: 'APP_VERSION_USER', value: '1.0.5', description: '当前用户端版本号（控制强更）' },
    { key: 'CUSTOMER_SERVICE_PHONE', value: '400-123-4567', description: '全平台统一客服热线' },
    { key: 'HOME_NOTICE_BAR', value: '欢迎使用小帮手！今日陪诊单量爆棚，请各位师傅积极接单。', description: '客户端首页跑马灯通知内容' },
    { key: 'CREDIT_DEFAULT_SCORE', value: '100', description: '新服务者初始信用分' },
    { key: 'CREDIT_ORDER_COMPLETED', value: '1', description: '完成一单奖励分值' },
    { key: 'CREDIT_PROVIDER_CANCEL', value: '-10', description: '服务者取消订单扣除分值' },
    { key: 'CREDIT_BAD_RATING', value: '-5', description: '收到用户差评扣除分值' },
    { key: 'CREDIT_MIN_ACCEPT_SCORE', value: '60', description: '允许接单的最低信用分' },
    { key: 'AMAP_KEY_WEB', value: '', description: '高德地图 Web 端 Key' },
    { key: 'AMAP_KEY_SERVER', value: '', description: '高德地图服务端 Key' },
    { key: 'AMAP_FALCON_SID', value: '', description: '高德猎鹰轨迹服务 SID (Service ID)' },
    { key: 'TENCENT_IM_SDKAPPID', value: '', description: '腾讯云 IM SDKAppID' },
    { key: 'TENCENT_IM_SECRET', value: '', description: '腾讯云 IM 密钥' },
    { key: 'ALIPAY_APP_ID', value: '', description: '支付宝开放平台 APPID' },
    { key: 'ALIPAY_PRIVATE_KEY', value: '', description: '支付宝商户私钥' },
    { key: 'ALIPAY_PUBLIC_KEY', value: '', description: '支付宝平台公钥' },
    { key: 'ALIYUN_SMS_KEY', value: '', description: '阿里云短信 AccessKey' },
    { key: 'ALIYUN_SMS_SECRET', value: '', description: '阿里云短信 AccessSecret' },
    { key: 'OSS_BUCKET', value: '', description: '对象存储 Bucket 名称' },
    { key: 'ID_VERIFY_APP_ID', value: '', description: '实名认证接口 APPID' },
    { key: 'FACE_RECOGNITION_KEY', value: '', description: '人脸识别接口 Key' },
    { key: 'FACE_RECOGNITION_SECRET', value: '', description: '人脸识别接口 Secret' }
  ]
  for (let s of seeds) {
    try {
      await request.post('/system/admin/configs', s)
    } catch (e) {}
  }
  isInitializing.value = false
  const res = await request.get('/system/admin/configs')
  configs.value = res || []
}

const saveConfig = async (row) => {
  try {
    await request.post('/system/admin/configs', {
      key: row.config_key,
      value: row.config_value,
      description: row.description
    })
    ElMessage.success('系统指令已全量下发，App 端已实时生效')
  } catch (e) {}
}

const handleAdd = () => {
  addForm.value = { key: '', value: '', description: '' }
  dialogVisible.value = true
}

const submitAdd = async () => {
  if (!addForm.value.key) return
  await request.post('/system/admin/configs', addForm.value)
  ElMessage.success('新策略项注入成功')
  dialogVisible.value = false
  loadConfigs()
}

onMounted(loadConfigs)
</script>
