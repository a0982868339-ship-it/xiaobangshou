<template>
  <div class="profile-edit-page">
    <van-nav-bar
      :title="isEdit ? '编辑陪诊档案' : '新建陪诊档案'"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
    />

    <div class="form-container">
      <van-form @submit="handleSave" class="textured-form">
        <!-- 整体化大卡片 -->
        <div class="integrated-profile-card">
          <!-- Section 1: 基础资料 -->
          <div class="form-section">
            <div class="section-header">
              <span class="dot"></span>
              <span class="label">基础信息</span>
            </div>
            
            <van-field
              v-model="form.name"
              label="姓名"
              placeholder="就诊人真实姓名"
              required
              class="minimal-field"
            />
            
            <div class="custom-cell required">
              <span class="cell-label">性别</span>
              <van-radio-group v-model="form.gender" direction="horizontal" class="minimal-radio">
                <van-radio :name="1" icon-size="18px">男</van-radio>
                <van-radio :name="2" icon-size="18px">女</van-radio>
              </van-radio-group>
            </div>

            <van-field
              v-model="form.age"
              label="年龄"
              type="digit"
              placeholder="请输入岁数"
              required
              class="minimal-field"
            />
          </div>

          <!-- Section 2: 偏好设置 -->
          <div class="form-section">
            <div class="section-header">
              <span class="dot"></span>
              <span class="label">常用设置</span>
            </div>
            
            <van-field
              v-model="form.hospital_name"
              label="常用医院"
              placeholder="选择就诊频率最高的医院"
              is-link
              readonly
              @click="showHospitalPicker = true"
              class="minimal-field"
            />
            
            <div class="custom-cell">
              <span class="cell-label">设为默认</span>
              <van-switch v-model="form.is_default" size="20" active-color="#11998e" :active-value="1" :inactive-value="0" />
            </div>
          </div>

          <!-- Section 3: 健康状态 -->
          <div class="form-section no-border">
            <div class="section-header">
              <span class="dot"></span>
              <span class="label">健康标签 & 备注</span>
            </div>
            
            <div class="tags-cloud">
              <div 
                v-for="tag in availableTags" 
                :key="tag" 
                class="glass-tag" 
                :class="{ 'active': form.tags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                <van-icon :name="form.tags.includes(tag) ? 'success' : 'plus'" />
                {{ tag }}
              </div>
            </div>
            
            <van-field
              v-model="form.remarks"
              type="textarea"
              placeholder="请填写过敏史、慢性病或其他特殊情况..."
              rows="3"
              autosize
              maxlength="200"
              show-word-limit
              class="minimal-textarea"
            />
          </div>
        </div>

        <div class="action-area">
          <van-button 
            block 
            round 
            type="primary" 
            native-type="submit" 
            :loading="submitting"
            class="btn-save-premium"
          >
            保存就诊档案
          </van-button>
          
          <van-button 
            v-if="isEdit"
            block 
            round 
            plain
            class="btn-delete-minimal" 
            @click="handleDelete"
          >
            删除档案
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 医院选择器 (极简质感重构版) -->
    <van-popup v-model:show="showHospitalPicker" position="bottom" round class="premium-hosp-popup">
      <div class="hosp-select-container">
        <div class="hosp-header">
          <div class="h-title">选择常用医院</div>
          <div class="h-subtitle">选择后预约陪诊将自动填充此医院</div>
        </div>

        <div class="hosp-list">
          <div 
            v-for="hosp in hospitalOptions" 
            :key="hosp.value" 
            class="hosp-card" 
            :class="{ 'active': form.hospital_name === hosp.text }"
            @click="onHospitalCardSelect(hosp)"
          >
            <div class="hc-icon-box">
              <van-icon name="hospital-o" />
            </div>
            <div class="hc-content">
              <div class="hc-name">{{ hosp.text }}</div>
              <div class="hc-tag">合作医疗机构</div>
            </div>
            <div class="hc-check" v-if="form.hospital_name === hosp.text">
              <van-icon name="success" />
            </div>
          </div>
          
          <van-empty v-if="hospitalOptions.length === 0" description="暂无合作医院数据" />
        </div>

        <div class="hosp-footer">
          <van-button block round class="btn-hosp-confirm" @click="showHospitalPicker = false">
            完成选择
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request, { getPatientProfileDetail, createPatientProfile, updatePatientProfile, deletePatientProfile } from '../api'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.query.id)
const submitting = ref(false)
const showHospitalPicker = ref(false)

const form = reactive({
  name: '',
  gender: 0, // 0-未选择, 1-男, 2-女
  age: '',
  hospital_name: '',
  tags: [],
  remarks: '',
  is_default: 0
})

const availableTags = ['需要轮椅', '行动不便', '听力较弱', '视力较弱', '慢性病', '高血压', '糖尿病', '心脏病']

const hospitalOptions = ref([])

const loadHospitals = async () => {
  try {
    // 默认获取三亚的医院
    const res = await request.get('/common/hospitals?city=三亚市')
    console.log('>> [LoadHospitals] Raw response:', res);
    // 修正：request 拦截器已经返回了 res.data，所以 res 直接就是数组
    if (res && Array.isArray(res)) {
      hospitalOptions.value = res.map(h => ({ text: h.name, value: h.name }))
    } else if (res && res.data) {
      // 备选逻辑，兼容未处理的情况
      hospitalOptions.value = res.data.map(h => ({ text: h.name, value: h.name }))
    }
  } catch (e) {
    console.error('>> [LoadHospitals] Error:', e);
  }
}

const toggleTag = (tag) => {
  const idx = form.tags.indexOf(tag)
  if (idx > -1) form.tags.splice(idx, 1)
  else form.tags.push(tag)
}

const onHospitalCardSelect = (hosp) => {
  form.hospital_name = hosp.text
}

const loadDetail = async () => {
  if (!isEdit.value) return
  try {
    const res = await getPatientProfileDetail(route.query.id)
    Object.assign(form, res)
    if (typeof res.tags === 'string') form.tags = JSON.parse(res.tags)
  } catch (e) {}
}

const handleSave = async () => {
  if (!form.name) return showToast('请输入就诊人姓名')
  if (!form.gender) return showToast('请选择就诊人性别')
  if (!form.age) return showToast('请输入就诊人年龄')

  try {
    submitting.value = true
    if (isEdit.value) {
      await updatePatientProfile(route.query.id, form)
      showSuccessToast('更新成功')
    } else {
      await createPatientProfile(form)
      showSuccessToast('创建成功')
    }
    router.back()
  } catch (e) {
  } finally {
    submitting.value = false
  }
}

const handleDelete = () => {
  showConfirmDialog({
    title: '确认删除',
    message: '确定要删除这个陪诊档案吗？'
  }).then(async () => {
    try {
      await deletePatientProfile(route.query.id)
      showSuccessToast('已删除')
      router.back()
    } catch (e) {}
  })
}

onMounted(() => {
  loadHospitals()
  loadDetail()
})
</script>

<style scoped>
.profile-edit-page {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 60px;
}

.form-container {
  padding: 16px;
}

/* 整体化一体卡片 */
.integrated-profile-card {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
  padding: 8px 20px;
}

.form-section {
  padding: 24px 0;
  border-bottom: 1px solid #f8fafc;
}

.form-section.no-border {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.section-header .dot {
  width: 4px;
  height: 14px;
  background: #11998e;
  border-radius: 2px;
}

.section-header .label {
  font-size: 15px;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: 0.5px;
}

/* 极简 Field 样式 */
:deep(.minimal-field) {
  padding: 12px 0;
  background: transparent;
}

:deep(.minimal-field .van-field__label) {
  font-weight: 700;
  color: #64748b;
  width: 80px;
}

:deep(.minimal-field .van-field__control) {
  color: #1e293b;
  font-weight: 600;
}

/* 自定义 Cell 样式 */
.custom-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.cell-label {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
}

.custom-cell.required .cell-label::before {
  content: '*';
  color: #ee0a24;
  margin-right: 2px;
}

.minimal-radio :deep(.van-radio__label) {
  font-weight: 600;
  color: #1e293b;
}

/* 标签云样式 */
.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.glass-tag {
  padding: 8px 16px;
  background: #f8fafc;
  border-radius: 100px;
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #f1f5f9;
}

.glass-tag.active {
  background: #eefaf8;
  border-color: #11998e;
  color: #11998e;
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.1);
}

.minimal-textarea {
  padding: 12px;
  background: #f8fafc;
  border-radius: 16px;
}

/* 动作按钮区 */
.action-area {
  margin-top: 40px;
}

.btn-save-premium {
  height: 54px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  font-weight: 800;
  font-size: 16px;
  color: white !important;
  border-radius: 16px !important;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.25);
  transition: all 0.3s;
}

.btn-save-premium:active {
  transform: translateY(2px);
  box-shadow: 0 4px 10px rgba(17, 153, 142, 0.15);
}

.btn-delete-minimal {
  margin-top: 16px;
  height: 50px;
  border: 1px solid #f1f5f9 !important;
  color: #94a3b8 !important;
  font-weight: 600;
  background: white !important;
}

/* 医院选择器质感重构 */
.premium-hosp-popup {
  height: 70%;
  background: #f8fafc;
}

.hosp-select-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hosp-header {
  padding: 28px 20px 20px;
  background: white;
  text-align: center;
}

.h-title {
  font-size: 18px;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.h-subtitle {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.hosp-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.hosp-card {
  background: white;
  border-radius: 18px;
  padding: 18px 20px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1.5px solid transparent;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.hosp-card:active {
  transform: scale(0.98);
}

.hosp-card.active {
  border-color: #11998e;
  background: #f0fdfa;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.08);
}

.hc-icon-box {
  width: 44px;
  height: 44px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #64748b;
  transition: all 0.25s;
}

.active .hc-icon-box {
  background: #11998e;
  color: white;
}

.hc-content {
  flex: 1;
}

.hc-name {
  font-size: 15px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 2px;
}

.hc-tag {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.hc-check {
  color: #11998e;
  font-size: 20px;
  font-weight: bold;
}

.hosp-footer {
  padding: 20px;
  background: white;
  border-top: 1px solid #f1f5f9;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.btn-hosp-confirm {
  height: 52px;
  background: #1a1a1a !important;
  border: none !important;
  font-weight: 800;
  color: white !important;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
</style>
