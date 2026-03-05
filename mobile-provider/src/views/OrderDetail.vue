<template>
  <div class="order-detail-page">
    <van-nav-bar title="订单详情" left-arrow @click-left="$router.back()" fixed placeholder class="minimal-nav" />
    
    <!-- 1. 品牌感状态头部 (沉浸式渐变) -->
    <div class="brand-hero" :style="{ ...heroStyle, padding: '60px 24px 80px', zIndex: 1 }">
      <!-- 装饰性光晕 -->
      <div :style="{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }"></div>
      
      <div class="hero-content">
        <!-- 新增：被指定订单提醒 -->
        <div v-if="order.assignment_type === 2 && order.status === 0" class="assigned-banner">
          <van-icon name="star" />
          <span>该订单由客户指名由您服务，请优先处理</span>
        </div>
        <div class="status-row" :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
          <!-- 左侧：状态大字 (修正对齐与间距) -->
          <div class="status-main" :style="{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
              <van-icon 
                :name="order.status === 2 ? 'play-circle-o' : getStatusIcon(order.status)" 
                :class="order.status === 2 ? 'w-icon-pulse' : 'status-icon-anim'" 
                :style="{ fontSize: '28px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))', opacity: 0.9 }"
              />
              <span class="status-text" :style="{ fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', textShadow: '0 2px 4px rgba(0,0,0,0.1)', color: '#fff', whiteSpace: 'nowrap' }">
                {{ order.status === 2 ? '正在服务' : getStatusText(order.status) }}
              </span>
            </div>
            <div :style="{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '4px', fontWeight: 500, letterSpacing: '0.5px', paddingLeft: '36px' }">
              <span v-if="order.status === 2">已持续服务 {{ servingTimeDisplay }}</span>
              <span v-else>准时到达 · 规范服务</span>
            </div>
          </div>

          <!-- 右侧：预计报酬 (紧凑化处理) -->
          <div class="header-reward-box" :style="{ background: 'rgba(255,255,255,0.25)', borderRadius: '20px', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.3)', textAlign: 'right', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', flex: 'none', marginLeft: '12px' }">
            <div :style="{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 800, letterSpacing: '1px', marginBottom: '2px' }">预计报酬</div>
            <div :style="{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }">
              <span :style="{ fontSize: '22px', color: '#fff', marginRight: '2px', fontWeight: 900 }">¥</span>
              <span :style="{ fontSize: '44px', color: '#fff', fontWeight: 900, fontFamily: 'DIN Alternate', lineHeight: 1 }">{{ ((order.total_price || 0) - (order.platform_fee || 0)).toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 弧形底边装饰 -->
      <div class="hero-arc"></div>
    </div>

    <!-- 2. 核心服务卡片 (悬浮层叠) -->
    <div class="floating-container" :style="{ marginTop: '-60px', position: 'relative', zIndex: 2 }">
      <!-- [状态机：服务中] 差异化渲染：强制地图置顶，隐藏无关卡片 -->
      <template v-if="order.status === 2 && serviceId === 36">
        <div class="detail-white-card" :style="{ padding: '0', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }">
          <!-- 地图容器 -->
          <div id="track-map-dashboard" style="width: 100%; height: 300px;"></div>
          
          <!-- 实时状态与计时并排显示栏 -->
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#fff', borderTop: '1px solid #f1f5f9' }">
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
              <div :style="{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(16,185,129,0.15)', animation: 'pulse-opacity 2s infinite' }"></div>
              <span :style="{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }">轨迹采集中</span>
            </div>
            
            <div :style="{ display: 'flex', alignItems: 'center', gap: '10px' }">
              <div :style="{ height: '24px', width: '1px', background: '#eee' }"></div>
              <div :style="{ textAlign: 'right' }">
                <div :style="{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }">已遛狗时长</div>
                <div :style="{ fontSize: '20px', fontWeight: 900, fontFamily: 'DIN Alternate', color: '#7c3aed' }">{{ walkingTimeDisplay }}</div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 核心预约信息卡片 (非服务中显示) -->
      <div v-if="order.status !== 2 || serviceId !== 36" class="detail-white-card" :style="{ marginBottom: '16px', boxShadow: '0 15px 35px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.8)' }">
        <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
          <div :style="{ flex: 1 }">
            <div :style="{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }">预约服务项目</div>
            <div :style="{ fontSize: '22px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }">{{ order.service_name }}</div>
          </div>
          <div :style="{ textAlign: 'right', paddingLeft: '16px', borderLeft: '1px solid #e2e8f0' }">
            <div :style="{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }">预约时间</div>
            <div :style="{ color: '#7c3aed', fontWeight: 900, fontSize: '16px', whiteSpace: 'nowrap' }">{{ formatDate(order.service_time) }}</div>
          </div>
        </div>
        <!-- 备注需求 (紧随其后) -->
        <div v-if="order.remark && !order.remark.includes('{')" :style="{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #f1f5f9' }">
          <div :style="{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px' }">客户备注需求</div>
          <div :style="{ color: '#ef4444', textAlign: 'left', background: '#fff5f5', padding: '12px 16px', borderRadius: '16px', fontSize: '14px', fontWeight: 600, lineHeight: 1.5, border: '1px solid #fee2e2' }">{{ order.remark }}</div>
        </div>
      </div>

      <!-- A. 医疗陪护专项：就诊人档案 (非服务中显示) -->
      <div v-if="order.status !== 2 && (order.category_name?.includes('陪诊') || order.service_name?.includes('陪诊'))" class="detail-white-card patient-info-card" :style="businessCardStyle('medical')">
        <div class="dw-title">
          <div class="title-left">
            <van-icon name="medal-o" class="title-icon medical" />
            <span :style="{ fontWeight: 900 }">就诊人档案</span>
          </div>
          <van-tag type="danger" plain round :style="{ padding: '2px 8px' }">核心保障</van-tag>
        </div>
        <div class="order-extra-info" :style="{ background: 'transparent', padding: 0 }">
          <div class="ex-row">
            <span class="ex-label" :style="labelStyle">姓名/年龄</span>
            <span class="ex-val" :style="{ fontSize: '15px' }">{{ order.patient_name || '未填' }} / {{ order.patient_age || '?' }}岁</span>
          </div>
          <div class="ex-row">
            <span class="ex-label" :style="labelStyle">性别</span>
            <span class="ex-val">{{ order.patient_gender === 1 ? '男' : (order.patient_gender === 2 ? '女' : '未知') }}</span>
          </div>
          <div class="ex-row" v-if="order.hospital_name">
            <span class="ex-label" :style="labelStyle">就诊医院</span>
            <span class="ex-val" :style="{ color: '#ef4444', fontWeight: 900 }">{{ order.hospital_name }}</span>
          </div>
        </div>
      </div>

      <div v-if="order.service_name?.includes('养老院') || order.service_name?.includes('探访')" class="detail-white-card patient-info-card" :style="businessCardStyle('medical')">
        <div class="dw-title">
          <div class="title-left">
            <van-icon name="shield-o" class="title-icon medical" />
            <span :style="{ fontWeight: 900 }">探访信息</span>
          </div>
          <van-tag color="#7c3aed" plain round :style="{ padding: '2px 8px' }">守护重点</van-tag>
        </div>
        <div class="order-extra-info" :style="{ background: 'transparent', padding: 0 }">
          <div class="ex-row">
            <span class="ex-label" :style="labelStyle">养老院名称</span>
            <span class="ex-val">{{ parseOptions(order.service_options).nursingHomeName || '未填' }}</span>
          </div>
          <div class="ex-row">
            <span class="ex-label" :style="labelStyle">老人信息</span>
            <span class="ex-val">{{ parseOptions(order.service_options).elderName || '未填' }}{{ parseOptions(order.service_options).elderAge ? ` / ${parseOptions(order.service_options).elderAge}岁` : '' }}{{ parseOptions(order.service_options).elderGender ? ` / ${parseOptions(order.service_options).elderGender}` : '' }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.service_options).relation">
            <span class="ex-label" :style="labelStyle">与老人关系</span>
            <span class="ex-val">{{ parseOptions(order.service_options).relation }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.service_options).visitPackage">
            <span class="ex-label" :style="labelStyle">探访时长</span>
            <span class="ex-val">{{ parseOptions(order.service_options).visitPackage }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.service_options).visitFocus?.length">
            <span class="ex-label" :style="labelStyle">探访重点</span>
            <span class="ex-val">{{ parseOptions(order.service_options).visitFocus.join('、') }}</span>
          </div>
        </div>
      </div>

      <!-- B. 宠物特护专项：宠物档案与标签 (服务中隐藏无关信息) -->
      <div class="detail-white-card pet-info-card" v-if="(order.category_name?.includes('宠物') || [36, 37].includes(order.service_id) || order.service_name?.includes('喂养') || order.service_name?.includes('遛狗')) && (order.status !== 2 || serviceId !== 36)" :style="businessCardStyle('pet')">
        <div class="dw-title">
          <div class="title-left">
            <van-icon name="guide-o" class="title-icon pet" />
            <span :style="{ fontWeight: 900 }">宠物服务档案</span>
          </div>
          <van-tag color="#7c3aed" plain round :style="{ padding: '2px 8px' }">专项信息</van-tag>
        </div>
        
        <!-- 全维度信息网格 -->
        <div class="order-extra-info" :style="{ background: 'transparent', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }">
          <div class="ex-row" v-if="parseOptions(order.remark).dogSize" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">狗狗体型</span>
            <span class="ex-val">{{ parseOptions(order.remark).dogSize }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.remark).catCount !== undefined" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">{{ order.service_name?.includes('猫') ? '猫咪数量' : (order.service_name?.includes('狗') ? '狗狗数量' : '宠物数量') }}</span>
            <span class="ex-val" :style="{ fontSize: '16px' }">{{ parseOptions(order.remark).catCount }} 只</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.remark).healthStatus" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">健康状态</span>
            <span class="ex-val" :style="{ color: '#10b981', fontWeight: 800 }">{{ parseOptions(order.remark).healthStatus }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.remark).ownLeash !== undefined" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">自带牵引绳</span>
            <span class="ex-val">{{ parseOptions(order.remark).ownLeash ? '是' : '否(需提供)' }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.remark).hasCamera !== undefined" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">家中摄像头</span>
            <span class="ex-val">{{ parseOptions(order.remark).hasCamera ? '开启中' : '未开启' }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.remark).needTrash !== undefined" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">代扔垃圾</span>
            <span class="ex-val">{{ parseOptions(order.remark).needTrash ? '是' : '否' }}</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.remark).keyHandover" :style="{ borderBottom: 'none' }">
            <span class="ex-label" :style="labelStyle">钥匙交接</span>
            <span class="ex-val">{{ parseOptions(order.remark).keyHandover }}</span>
          </div>
        </div>

        <div class="pet-tags-section" :style="{ marginTop: '24px', paddingTop: '20px', borderTop: '1px dashed #f1f5f9' }">
          <div class="pts-label" :style="labelStyle">性格与特殊指令</div>
          <div class="pts-content" :style="{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }">
            <template v-if="parseOptions(order.remark).personalityTags?.length > 0">
              <van-tag v-for="tag in parseOptions(order.remark).personalityTags" :key="tag" color="#f5f3ff" text-color="#7c3aed" round class="pts-tag" :style="{ padding: '6px 12px', fontSize: '12px', boxShadow: '0 2px 6px rgba(124,58,237,0.05)', margin: '0 4px 4px 0' }">{{ tag }}</van-tag>
            </template>
            <template v-if="parseOptions(order.remark).specialInstructions?.length > 0">
              <van-tag v-for="tag in parseOptions(order.remark).specialInstructions" :key="tag" color="#fff7ed" text-color="#f97316" round class="pts-tag" :style="{ padding: '6px 12px', fontSize: '12px', boxShadow: '0 2px 6px rgba(249,115,22,0.05)', margin: '0 4px 4px 0' }">{{ tag }}</van-tag>
            </template>
            <div v-if="(!parseOptions(order.remark).personalityTags || parseOptions(order.remark).personalityTags.length === 0) && (!parseOptions(order.remark).specialInstructions || parseOptions(order.remark).specialInstructions.length === 0)" class="pts-empty">用户未填写额外信息</div>
          </div>
        </div>
      </div>

      <!-- C. 居家办事专项：口味与人数 -->
      <div class="detail-white-card home-info-card" v-if="order.category_name?.includes('居家') || order.service_name?.includes('做饭')" :style="businessCardStyle('home')">
        <div class="dw-title">
          <div class="title-left">
            <van-icon name="shop-o" class="title-icon home" />
            <span :style="{ fontWeight: 900 }">居家服务细节</span>
          </div>
          <van-tag type="success" plain round :style="{ padding: '2px 8px' }">大厨上门</van-tag>
        </div>
        <div class="order-extra-info" :style="{ background: 'transparent', padding: 0 }">
          <div class="ex-row" v-if="parseOptions(order.service_options).dinersCount">
            <span class="ex-label" :style="labelStyle">用餐人数</span>
            <span class="ex-val" :style="{ fontSize: '16px' }">{{ parseOptions(order.service_options).dinersCount }} 人</span>
          </div>
          <div class="ex-row" v-if="parseOptions(order.service_options).flavorPrefs">
            <span class="ex-label" :style="labelStyle">口味偏好</span>
            <span class="ex-val" :style="{ color: '#10b981', fontWeight: 800 }">
              {{ parseOptions(order.service_options).flavorPrefs.salt }} / 
              {{ parseOptions(order.service_options).flavorPrefs.spicy }}
            </span>
          </div>
          <div class="ex-row" v-if="order.dish_details">
            <span class="ex-label" :style="labelStyle">菜品明细</span>
            <span class="ex-val" :style="{ fontSize: '13px', color: '#1e293b' }">
              <template v-for="(count, type) in (typeof order.dish_details === 'string' ? JSON.parse(order.dish_details) : order.dish_details)" :key="type">
                <span v-if="count > 0" style="margin-left: 8px;">{{ {main:'主菜', side:'副菜', veg:'素菜', soup:'汤类'}[type] }}x{{ count }}</span>
              </template>
            </span>
          </div>
          <div class="ex-row">
            <span class="ex-label" :style="labelStyle">代买食材</span>
            <span class="ex-val">{{ (order.need_shopping === 1 || parseOptions(order.service_options).needShopping) ? '是' : '否' }}</span>
          </div>
        </div>
      </div>

      <!-- 客户评价 (考核重点) -->
      <div class="detail-white-card assessment-card" v-if="[3, 5].includes(order.status) && order.status !== 12">
        <div class="dw-title assessment-header">
          <span>客户服务评价</span>
          <van-tag v-if="order.status === 5" type="danger" plain round size="small">已计入考核</van-tag>
          <van-tag v-else type="warning" plain round size="small">待客户评价</van-tag>
        </div>
        <div class="assessment-content">
          <template v-if="order.status === 5">
            <div class="rate-row">
              <van-rate :model-value="Number(order.review_rating || 0)" readonly color="#ffd21e" void-icon="star" void-color="#eee" size="20" />
              <span class="rate-text">{{ Number(order.review_rating || 0).toFixed(1) }} 分</span>
            </div>
            <div class="review-text" v-if="order.review_content">
              “ {{ order.review_content }} ”
            </div>
            <div class="review-meta" v-if="order.review_time">
              评价时间：{{ formatDate(order.review_time) }}
            </div>
          </template>
          <div v-else class="pending-review-box">
            <van-icon name="clock-o" size="24" color="#faad14" />
            <p>服务已完成，正在等待客户评价报告...</p>
            <span class="tips-sm">评价后将自动计入您的服务星级</span>
          </div>
        </div>
      </div>

      <!-- 3. 履约工作台 (服务中专属) -->
      <div class="detail-white-card workspace-card" v-if="order.status === 2 && (order.service_name?.includes('陪诊') || order.category_name?.includes('陪诊') || order.service_name?.includes('做饭') || order.category_name?.includes('居家'))">
        <div class="dw-title">
          <span>服务执行工作台</span>
          <div class="sync-indicator" :class="{ 'is-syncing': isSyncing }">
            <van-icon :name="isSyncing ? 'replay' : 'cloud-upload-o'" />
            <span>{{ isSyncing ? '云端同步中...' : '记录已自动保存' }}</span>
          </div>
        </div>
        
        <div class="medical-action-grid">
          <!-- 陪诊工具 -->
          <template v-if="order.service_name?.includes('陪诊') || order.category_name?.includes('陪诊')">
            <div class="m-tool-btn" @click="showAdvicePopup = true">
              <div class="m-icon-box advice"><van-icon name="notes-o" /></div>
              <span>录入医嘱</span>
              <van-tag v-if="medicalAdvice" type="success" size="mini" round dot class="m-dot" />
            </div>
            <div class="m-tool-btn" @click="showBillPopup = true">
              <div class="m-icon-box bill"><van-icon name="bill-o" /></div>
              <span>上传账单</span>
              <van-tag v-if="billFiles.length > 0" type="success" size="mini" round dot class="m-dot" />
            </div>
            <div class="m-tool-btn" @click="showDrugPopup = true">
              <div class="m-icon-box drug"><van-icon name="clock-o" /></div>
              <span>用药提醒</span>
              <van-tag v-if="drugRemindText" type="success" size="mini" round dot class="m-dot" />
            </div>
          </template>

          <div class="m-tool-btn" @click="handleShareProgress">
            <div class="m-icon-box share"><van-icon name="share-o" /></div>
            <span>进度分享</span>
          </div>
          <!-- 新增：做饭业务代买食材工具 -->
          <div class="m-tool-btn" v-if="(order.need_shopping === 1 || parseOptions(order.service_options).needShopping)" @click="showGroceryPopup = true">
            <div class="m-icon-box" style="background: #eef2ff; color: #4f46e5;"><van-icon name="shopping-cart-o" /></div>
            <span>买菜支出</span>
            <van-tag v-if="groceryForm.actualAmount" type="success" size="mini" round dot class="m-dot" />
          </div>
        </div>
      </div>

      <!-- 客户信息与联系 (极简质感重塑) -->
      <div class="glass-card customer-glass" :style="{ border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', borderRadius: '24px' }">
        <div class="c-info-box" :style="{ paddingBottom: '20px' }">
          <div class="c-avatar" :style="{ width: '56px', height: '56px', background: '#f1f5f9', color: '#0f172a', borderRadius: '20px', fontWeight: 900, fontSize: '24px' }">{{ order.contact_name?.[0] || '客' }}</div>
          <div class="c-text" :style="{ marginLeft: '4px' }">
            <div class="c-name" :style="{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }">{{ order.contact_name || '下单客户' }}</div>
            <div class="c-phone" :style="{ color: '#7c3aed', marginTop: '6px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }">
              <van-icon name="shield-o" /> 隐私虚拟号保护中
            </div>
          </div>
          <div class="c-actions" v-if="[1, 2, 11, 12].includes(order.status)" :style="{ gap: '12px' }">
            <div class="circle-btn chat" @click="goToChat" :style="{ width: '44px', height: '44px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }"><van-icon name="chat" /></div>
            <div class="circle-btn phone" @click="handlePrivacyCall" :style="{ width: '44px', height: '44px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }"><van-icon name="phone" /></div>
          </div>
        </div>
        
        <!-- 极致简约地址布局 -->
        <div :style="{ marginTop: '20px', padding: '16px 0', borderTop: '1px solid #f1f5f9' }" @click="handleNavigation">
          <div :style="{ display: 'flex', alignItems: 'flex-start', gap: '12px' }">
            <van-icon :name="order.hospital_name ? 'hospital-o' : 'location'" :style="{ fontSize: '20px', color: '#94a3b8', marginTop: '2px' }" />
            <div :style="{ flex: 1 }">
              <div :style="{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }">服务地址</div>
              <template v-if="order.status >= 1">
                <div :style="{ fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1.5 }">
                  {{ order.hospital_name || order.service_address || '未填地址' }}
                </div>
              </template>
              <template v-else>
                <div :style="{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }">距离您约 {{ order.distance ? order.distance.toFixed(1) : '?' }} km</div>
                <div :style="{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }">接单后可见精准门牌号</div>
              </template>
            </div>
            <div :style="{ alignSelf: 'center', background: '#f1f5f9', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }">
              <span :style="{ fontSize: '12px', color: '#475569', fontWeight: 700 }">导航</span>
              <van-icon name="arrow" :style="{ fontSize: '12px', color: '#475569' }" />
            </div>
          </div>
        </div>
      </div>

      <!-- 喂猫专项：强制任务清单 (Checklist) -->
      <div class="detail-white-card cat-checklist-card" v-if="order.status === 2 && serviceId === 37">
        <!-- ... 喂猫逻辑保持不变 ... -->
        <div class="dw-title">
          <span>强制服务清单</span>
          <van-tag type="danger">必须依次完成</van-tag>
        </div>
        <div class="cat-steps">
          <div class="cat-step-item" :class="{ 'done': catChecklist.plateVideo }">
            <div class="cs-circle">1</div>
            <div class="cs-info">
              <div class="cs-name">门牌号/入场录像</div>
              <div class="cs-desc">需录制门牌号及开启过程</div>
            </div>
            <van-uploader :after-read="f => uploadCatProof(f, 'plateVideo')" capture="camera" accept="video/*">
              <van-button size="small" :type="catChecklist.plateVideo ? 'success' : 'primary'" round>
                {{ catChecklist.plateVideo ? '已上传' : '上传视频' }}
              </van-button>
            </van-uploader>
          </div>

          <div class="cat-step-item" :class="{ 'done': catChecklist.cleaning.length > 0, 'disabled': !catChecklist.plateVideo }">
            <div class="cs-circle">2</div>
            <div class="cs-info">
              <div class="cs-name">铲屎/换水/清扫</div>
              <div class="cs-desc">请拍摄清理后的猫砂盆与水盆</div>
            </div>
            <van-uploader :after-read="f => uploadCatProof(f, 'cleaning')" multiple :disabled="!catChecklist.plateVideo">
              <van-button size="small" :type="catChecklist.cleaning.length > 0 ? 'success' : 'primary'" round :disabled="!catChecklist.plateVideo">
                {{ catChecklist.cleaning.length > 0 ? '已上传' : '上传照片' }}
              </van-button>
            </van-uploader>
          </div>

          <div class="cat-step-item" :class="{ 'done': catChecklist.feedingVideo, 'disabled': catChecklist.cleaning.length === 0 }">
            <div class="cs-circle">3</div>
            <div class="cs-info">
              <div class="cs-name">15秒喂食/互动视频</div>
              <div class="cs-desc">记录猫咪进食状态与精神面貌</div>
            </div>
            <van-uploader :after-read="f => uploadCatProof(f, 'feedingVideo')" capture="camera" accept="video/*" :disabled="catChecklist.cleaning.length === 0">
              <van-button size="small" :type="catChecklist.feedingVideo ? 'success' : 'primary'" round :disabled="catChecklist.cleaning.length === 0">
                {{ catChecklist.feedingVideo ? '已上传' : '录制15s' }}
              </van-button>
            </van-uploader>
          </div>
        </div>
      </div>

      <!-- 遛狗专项：履约工作台 (ID 36) -->
      <div class="detail-white-card dog-walking-card" v-if="order.status === 2 && serviceId === 36">
        <div class="dw-title">
          <span>遛狗履约工作台</span>
          <van-tag type="primary">分段式存证</van-tag>
        </div>
        
        <div class="cat-steps">
          <!-- 1. 运动/排泄记录 (仅在遛狗中显示) -->
          <div class="cat-step-item" :class="{ 'disabled': !order.is_walking && walkingDuration === 0 }">
            <div class="cs-circle">1</div>
            <div class="cs-info">
              <div class="cs-name">运动/排泄记录</div>
              <div class="cs-desc">实时记录狗狗状态与位置</div>
            </div>
            <van-uploader :after-read="f => uploadWalkingProof(f, 'walking_proof')" multiple :disabled="Boolean(!order.is_walking && walkingDuration === 0)">
              <van-button size="small" type="primary" round plain :disabled="Boolean(!order.is_walking && walkingDuration === 0)">
                记录状态 ({{ walkingChecklist.walking_proof.length }})
              </van-button>
            </van-uploader>
          </div>

          <!-- 2. 送回确认 (仅在结束遛狗后显示) -->
          <div class="cat-step-item" :class="{ 'done': !!walkingChecklist.exit_proof, 'disabled': Boolean(order.is_walking || walkingDuration === 0) }">
            <div class="cs-circle">2</div>
            <div class="cs-info">
              <div class="cs-name">送回/离场视频</div>
              <div class="cs-desc">完成服务前请上传送回凭证</div>
            </div>
            <van-uploader :after-read="f => uploadWalkingProof(f, 'exit_proof')" capture="camera" accept="video/*" :disabled="Boolean(order.is_walking || walkingDuration === 0)">
              <van-button size="small" :type="walkingChecklist.exit_proof ? 'success' : 'primary'" round :disabled="Boolean(order.is_walking || walkingDuration === 0)">
                {{ walkingChecklist.exit_proof ? '已上传' : '上传视频' }}
              </van-button>
            </van-uploader>
          </div>
        </div>
      </div>

      <!-- 喂猫专项：环境备注浮窗 (ID 37 专项) -->
      <div class="cat-env-floating" v-if="order.status === 2 && serviceId === 37" @click="showEnvNote = true">
        <van-icon name="info-o" />
        <span>环境备注</span>
      </div>

      <van-popup v-model:show="showEnvNote" round position="center" class="env-note-popup">
        <div class="en-card">
          <div class="en-title">环境与指引备注</div>
          <div class="en-section">
            <div class="en-label">水粮/砂盆位置</div>
            <div class="en-val">{{ parseOptions(order.remark).specialInstructions?.join('、') || (typeof order.remark === 'string' && !order.remark.includes('{') ? order.remark : '客户未填写，请沟通确认') }}</div>
          </div>
          <div class="en-section">
            <div class="en-label">安全告知</div>
            <div class="en-row">
              <div class="en-tag" :class="{ 'warning': parseOptions(order.service_options).hasCamera }">
                <van-icon name="video-o" /> {{ parseOptions(order.service_options).hasCamera ? '家中有摄像头' : '无摄像头' }}
              </div>
              <div class="en-tag info" v-if="parseOptions(order.service_options).needTrash">
                <van-icon name="delete-o" /> 需代扔垃圾
              </div>
            </div>
          </div>
          <van-button block round class="en-close-btn" @click="showEnvNote = false">我已了解</van-button>
        </div>
      </van-popup>

      <!-- 周期单排期轨迹 -->
      <div class="detail-white-card" v-if="order.order_type === 1">
        <div class="dw-title">服务执行进度 ({{ order.completed_count }}/{{ order.total_count }})</div>
        <div class="timeline-track">
          <div v-for="item in order.schedules" :key="item.id" class="time-node" :class="{ 'active': item.status === 1 }">
            <div class="node-left">
              <div class="dot"></div>
              <div class="line"></div>
            </div>
            <div class="node-right">
              <div class="node-info">
                <div class="n-date">{{ formatDateShort(item.service_date) }} {{ item.service_time }}</div>
                <div class="n-status">
                  <van-tag v-if="item.status === 1" type="success" plain>已完成</van-tag>
                  <van-tag v-else-if="isToday(item.service_date)" type="primary">今日待办</van-tag>
                  <van-tag v-else type="default">待打卡</van-tag>
                </div>
              </div>
              <van-button 
                v-if="item.status === 0 && order.status === 2" 
                size="small" 
                round 
                :type="isToday(item.service_date) ? 'primary' : 'default'"
                class="n-btn" 
                @click="handleSchedulePunch(item)"
              >
                {{ isToday(item.service_date) ? '今日打卡' : '去打卡' }}
              </van-button>
            </div>
          </div>
          <!-- 兜底：如果 schedules 数组为空 -->
          <van-empty v-if="!order.schedules || order.schedules.length === 0" description="暂无排期数据" image-size="60" />
        </div>
      </div>

      <!-- 4. 订单溯源码 (折叠式设计) -->
      <div class="detail-white-card" :style="{ background: 'transparent', boxShadow: 'none', marginTop: '12px', padding: '0 8px' }">
        <div @click="showOrderMeta = !showOrderMeta" :style="{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '12px 0', color: '#94a3b8', cursor: 'pointer' }">
          <span :style="{ fontSize: '12px', fontWeight: 600 }">{{ showOrderMeta ? '收起订单详情' : '查看更多订单信息' }}</span>
          <van-icon :name="showOrderMeta ? 'arrow-up' : 'arrow-down'" :style="{ fontSize: '12px' }" />
        </div>

        <transition name="van-fade">
          <div v-if="showOrderMeta" :style="{ fontSize: '12px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.5)', padding: '16px', borderRadius: '16px', marginTop: '4px' }">
            <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
              <span>订单编号</span>
              <div :style="{ display: 'flex', alignItems: 'center', gap: '4px' }">
                <span :style="{ color: '#475569', fontWeight: 600 }">{{ order.order_no }}</span>
                <van-icon name="description" @click.stop="copyOrderNo" />
              </div>
            </div>
            <div :style="{ display: 'flex', justifyContent: 'space-between' }">
              <span>下单时间</span>
              <span :style="{ color: '#475569' }">{{ formatDate(order.created_at) }}</span>
            </div>
            <div v-if="order.accepted_at" :style="{ display: 'flex', justifyContent: 'space-between' }">
              <span>接单时间</span>
              <span :style="{ color: '#475569' }">{{ formatDate(order.accepted_at) }}</span>
            </div>
            <div v-if="order.started_at" :style="{ display: 'flex', justifyContent: 'space-between' }">
              <span>开始服务</span>
              <span :style="{ color: '#475569' }">{{ formatDate(order.started_at) }}</span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- 底部操作按钮 (浮动灵动设计) -->
    <div class="action-footer-floating" v-if="[0, 1, 2, 11, 12].includes(order.status)">
      <div class="footer-inner">
        <!-- 待接单状态 -->
        <van-button v-if="order.status === 0" block round class="btn-primary-glow" @click="handleAcceptOrder">立即接单</van-button>
        
        <!-- 协商取消处理 -->
        <div v-if="order.status === 12" class="serving-actions-v2">
          <div class="chat-btn-circle" @click="goToChat">
            <van-icon name="chat" />
          </div>
          <div class="main-action-area" :style="{ display: 'flex', gap: '12px' }">
            <van-button block round @click="handleCancelResponse('reject')" :style="{ height: '52px', flex: 1, background: '#1a1a1a', color: '#fff', border: 'none' }">拒绝取消</van-button>
            <van-button block round type="danger" class="btn-danger-glow" @click="handleCancelResponse('agree')" :style="{ height: '52px', flex: 1.5 }">同意取消</van-button>
          </div>
        </div>
        
        <van-button 
          v-if="order.status === 1 || order.status === 11" 
          block 
          round 
          class="btn-primary-glow" 
          @click="handleStatusUpdate(order.status === 1 ? 11 : 2)"
          :style="{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', boxShadow: '0 12px 24px rgba(17,153,142,0.3)', height: '56px', fontSize: '17px' }"
        >{{ order.status === 1 ? '确认到达' : '开始服务' }}</van-button>
        
        <!-- 服务中状态 -->
        <div class="serving-actions-v2" v-if="order.status === 2">
          <!-- 快捷联系 -->
          <div class="chat-btn-circle" @click="goToChat">
            <van-icon name="chat" />
          </div>
          
          <!-- 主动作区域 -->
          <div class="main-action-area">
            <template v-if="order.service_name?.includes('遛狗')">
              <van-button 
                v-if="order.is_walking !== 1 && walkingDuration === 0" 
                block round class="btn-primary-glow" 
                icon="play" 
                @click="handleWalking(true)"
              >开始遛狗</van-button>
              
              <van-button 
                v-else-if="order.is_walking === 1" 
                block round type="danger" 
                class="btn-danger-glow pulse-anim" 
                icon="stop" 
                @click="handleWalking(false)"
              >结束遛狗</van-button>
              
              <van-button 
                v-else-if="order.is_walking === 0 && walkingDuration > 0" 
                block round class="btn-primary-glow" 
                @click="openCompletePopup"
              >提交遛狗报告</van-button>
            </template>
            
            <template v-else>
              <van-button 
                v-if="order.order_type === 1 && order.completed_count < order.total_count"
                block round class="btn-primary-glow" 
                style="background: #f8fafc !important; color: #94a3b8 !important; box-shadow: none !important; border: 1px solid #f1f5f9 !important;"
                @click="scrollToSchedules"
              >
                请先完成每日打卡 ({{ order.completed_count }}/{{ order.total_count }})
              </van-button>
              <van-button v-else block round class="btn-primary-glow" @click="openCompletePopup">完成服务并上传报告</van-button>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <div class="bottom-safe-padding"></div>

    <!-- 医嘱记录弹窗 -->
    <van-popup v-model:show="showAdvicePopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">录入医生医嘱</div>
          <div class="p-p-desc">请准确记录医生的叮嘱，以便客户查看</div>
        </div>
        <div class="p-header-close" @click="showAdvicePopup = false">
          <van-icon name="cross" />
        </div>
      </div>
      <div class="p-popup-content">
        <van-field
          v-model="medicalAdvice"
          rows="4"
          autosize
          type="textarea"
          maxlength="500"
          placeholder="请输入医生开具的医嘱、注意事项、下次复诊时间等..."
          show-word-limit
          class="p-remark-field"
        />
        <!-- 新增：医嘱图片上传 -->
        <div class="p-report-section" style="margin-top: 20px;">
          <div class="p-sec-label">医嘱/病历照片 <span>(可选)</span></div>
          <van-uploader 
            v-model="medicalAdviceFiles" 
            multiple 
            :max-count="6" 
            :after-read="afterReadProof"
            preview-size="80px"
            class="p-uploader-custom"
          />
        </div>
        <div class="p-submit-container">
          <van-button block round class="p-btn-submit" :loading="submitting" @click="saveMedicalAdvice">保存医嘱</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 账单上传弹窗 -->
    <van-popup v-model:show="showBillPopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">上传费用账单</div>
          <div class="p-p-desc">上传门诊费、药费等票据，方便客户报销/对账</div>
        </div>
        <div class="p-header-close" @click="showBillPopup = false">
          <van-icon name="cross" />
        </div>
      </div>
      <div class="p-popup-content">
        <div class="p-report-section">
          <van-uploader 
            v-model="billFiles" 
            multiple 
            :max-count="9" 
            :after-read="afterReadProof"
            preview-size="100px"
            class="p-uploader-custom"
          />
        </div>
        <div class="p-submit-container">
          <van-button block round class="p-btn-submit" @click="saveBillPhotos">确认上传</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 用药提醒弹窗 (新增) -->
    <van-popup v-model:show="showDrugPopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">设置用药提醒</div>
          <div class="p-p-desc">填写药品名称、用法用量及服用时间</div>
        </div>
        <div class="p-header-close" @click="showDrugPopup = false">
          <van-icon name="cross" />
        </div>
      </div>
      <div class="p-popup-content">
        <div class="p-report-section">
          <van-field
            v-model="drugRemindText"
            rows="4"
            autosize
            type="textarea"
            maxlength="200"
            placeholder="例：阿司匹林，每日3次，饭后半小时服用..."
            show-word-limit
            class="p-remark-field"
          />
        </div>
        <!-- 新增：用药图片上传 -->
        <div class="p-report-section">
          <div class="p-sec-label">药品包装/说明书照片 <span>(可选)</span></div>
          <van-uploader 
            v-model="drugFiles" 
            multiple 
            :max-count="3" 
            :after-read="afterReadProof"
            preview-size="80px"
            class="p-uploader-custom"
          />
        </div>
        <div class="p-submit-container">
          <van-button block round class="p-btn-submit" :loading="submitting" @click="saveDrugRemind">确认提醒</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 分享进度面板 (新增) -->
    <van-share-sheet
      v-model:show="showShareSheet"
      title="分享服务进度给家属"
      :options="shareOptions"
      @select="onShareSelect"
    />

    <!-- 买菜支出记录弹窗 -->
    <van-popup v-model:show="showGroceryPopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">买菜支出存证</div>
          <div class="p-p-desc">请如实上传凭证，支出金额仅供展示核对</div>
        </div>
        <div class="p-header-close" @click="showGroceryPopup = false">
          <van-icon name="cross" />
        </div>
      </div>
      <div class="p-popup-content">
        <van-field
          v-model="groceryForm.actualAmount"
          type="number"
          label="买菜总支出"
          placeholder="请输入买菜总金额"
          suffix="元"
          class="p-remark-field"
        />
        
        <div class="p-report-section" style="margin-top: 20px;">
          <div class="p-sec-label">支付记录照片 <span>(超市小票/转账截图)</span></div>
          <van-uploader 
            v-model="groceryForm.receiptFiles" 
            multiple 
            :max-count="3" 
            :after-read="afterReadProof"
            preview-size="80px"
            class="p-uploader-custom"
          />
        </div>

        <div class="p-report-section">
          <div class="p-sec-label">称重/计价视频 <span>(确保重量单价清晰)</span></div>
          <van-uploader 
            v-model="groceryForm.weighingFiles" 
            accept="video/*"
            :max-count="1" 
            :after-read="afterReadProof"
            preview-size="80px"
            class="p-uploader-custom"
          />
        </div>

        <div class="p-submit-container">
          <van-button block round class="p-btn-submit" :loading="submitting" @click="saveGroceryProof">确认并同步</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 完成服务报告弹窗 (极简质感版) -->
    <van-popup v-model:show="showCompletePopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">提交服务报告</div>
          <div class="p-p-desc">请确保服务质量，上传真实凭证</div>
        </div>
        <div class="p-header-close" @click="showCompletePopup = false">
          <van-icon name="cross" />
        </div>
      </div>

      <div class="p-popup-content">
        <!-- 1. 照片上传区 (遛狗与喂猫业务彻底移除) -->
        <div class="p-report-section" v-if="serviceId !== 36 && serviceId !== 37">
          <div class="p-sec-label">服务实拍 <span>(至少1张)</span></div>
          <van-uploader 
            v-model="proofFiles" 
            multiple 
            :max-count="6" 
            :after-read="afterReadProof"
            preview-size="100px"
            class="p-uploader-custom"
          >
            <div class="p-upload-slot">
              <van-icon name="photograph" />
              <span>拍摄照片</span>
            </div>
          </van-uploader>
        </div>

        <!-- 宠物业务提示：自动关联过程存证 -->
        <div class="p-report-section" v-else>
          <div class="p-sec-label">服务实拍 <span>(已自动关联)</span></div>
          <div :style="{ background: '#f8fafc', padding: '16px', borderRadius: '16px', color: '#11998e', fontSize: '13px', fontWeight: 600, border: '1px dashed #bcf0da' }">
            <van-icon name="passed" /> 系统已自动关联您在服务过程中拍摄的 {{ serviceId === 36 ? walkingChecklist.walking_proof.length : catChecklist.cleaning.length }} 张照片
          </div>
        </div>

        <!-- 2. 勾选标签区 -->
        <div class="p-report-section">
          <div class="p-sec-label">完成项确认 <span>(多选)</span></div>
          <div class="p-tag-grid">
            <div 
              v-for="tag in completionTags" 
              :key="tag" 
              class="p-pill-tag"
              :class="{ 'active': selectedTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              <van-icon :name="selectedTags.includes(tag) ? 'success' : 'plus'" />
              {{ tag }}
            </div>
          </div>
        </div>

        <!-- 3. 提交按钮 -->
        <div class="p-submit-container">
          <van-button 
            block 
            round 
            class="p-btn-submit" 
            :loading="submitting"
            @click="handleCompleteSubmit"
          >
            确认完成并提交成果
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 周期单每日打卡弹窗 (新增) -->
    <van-popup v-model:show="showPunchPopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">今日服务打卡</div>
          <div class="p-p-desc">{{ currentPunchItem ? formatDateShort(currentPunchItem.service_date) : '' }} 服务反馈</div>
        </div>
        <div class="p-header-close" @click="showPunchPopup = false">
          <van-icon name="cross" />
        </div>
      </div>

      <div class="p-popup-content">
        <div class="p-report-section">
          <div class="p-sec-label">现场实拍 <span>(上传今日工作照片)</span></div>
          <van-uploader 
            v-model="punchFiles" 
            multiple 
            :max-count="3" 
            :after-read="afterReadProof"
            preview-size="100px"
            class="p-uploader-custom"
          >
            <div class="p-upload-slot">
              <van-icon name="photograph" />
              <span>拍摄照片</span>
            </div>
          </van-uploader>
        </div>

        <div class="p-submit-container">
          <van-button 
            block 
            round 
            class="p-btn-submit" 
            :loading="submitting"
            @click="handlePunchSubmit"
          >
            提交今日打卡
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 遛狗专项：入场视频上传弹窗 (状态机驱动) -->
    <van-popup v-model:show="showEntryProofPopup" position="bottom" round class="premium-complete-popup">
      <div class="p-popup-header">
        <div class="p-header-left">
          <div class="p-p-title">拍摄接狗视频</div>
          <div class="p-p-desc">开始服务前请先录制接狗/入场视频</div>
        </div>
        <div class="p-header-close" @click="showEntryProofPopup = false">
          <van-icon name="cross" />
        </div>
      </div>
      <div class="p-popup-content">
        <div class="p-report-section" :style="{ textAlign: 'center', padding: '40px 0' }">
          <van-uploader :after-read="f => uploadWalkingProof(f, 'entry_proof')" capture="camera" accept="video/*">
            <div v-if="!walkingChecklist.entry_proof" class="p-upload-slot" :style="{ width: '160px', height: '160px', margin: '0 auto' }">
              <van-icon name="video" :style="{ fontSize: '48px' }" />
              <span>点击录制视频</span>
            </div>
            <div v-else :style="{ textAlign: 'center' }">
              <van-icon name="passed" :style="{ fontSize: '64px', color: '#07c160' }" />
              <div :style="{ marginTop: '12px', color: '#07c160', fontWeight: 700 }">视频已就绪</div>
            </div>
          </van-uploader>
        </div>
        <div class="p-submit-container">
          <van-button block round class="p-btn-submit" :disabled="!walkingChecklist.entry_proof" @click="handleStatusUpdate(2)">确认并开始服务</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick, reactive, h, render } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request, { getOrderDetail, updateOrderStatus, acceptOrder } from '../api'
import { useSocket } from '../composables/useSocket'
import NotificationCard from '../components/NotificationCard.vue'
import { showToast, showConfirmDialog, showSuccessToast, showLoadingToast } from 'vant'
import { loadAMap } from '../utils/amap'
import ResultDashboard from '../components/ResultDashboard.vue'

const route = useRoute()
const router = useRouter()
const order = ref({})
const isRecurringSession = computed(() => route.query.type === 'recurring')
const serviceId = computed(() => order.value.service_id)

// 喂猫专项逻辑 (ID 37)
const catChecklist = reactive({
  plateVideo: null,
  cleaning: [],
  feedingVideo: null
})

// 遛狗专项逻辑 (ID 36)
const walkingChecklist = reactive({
  entry_proof: null,
  walking_proof: [],
  exit_proof: null,
  trajectory: []
})

const showEnvNote = ref(false)
const showOrderMeta = ref(false)

const copyOrderNo = () => {
  showToast('订单号已复制')
}

const parseOptions = (str) => {
  try {
    // 1. 如果传入了非空字符串，优先尝试解析该字符串
    if (typeof str === 'string' && str.includes('{')) {
      return JSON.parse(str);
    }
    
    // 2. 兼容性：如果传入的是对象，直接返回
    if (typeof str === 'object' && str !== null) {
      return str;
    }

    // 3. 兜底逻辑：优先从 order.pet_info 读取 (后端 PetOrderStrategy 注入的字段)
    if (order.value.pet_info && typeof order.value.pet_info === 'object' && Object.keys(order.value.pet_info).length > 0) {
      return order.value.pet_info;
    }
    
    // 4. 再次兼容性处理：如果 pet_info 不存在，尝试解析 order.remark
    if (order.value.remark && typeof order.value.remark === 'string' && order.value.remark.includes('{')) {
      return JSON.parse(order.value.remark);
    }
    
    return {}
  } catch(e) { 
    return {} 
  }
}

const uploadCatProof = async (file, type) => {
  const isVideo = file.file.type.includes('video')
  
  if (isVideo) {
    showLoadingToast({ message: '正在上传视频...', forbidClick: true })
  }

  try {
    const formData = new FormData()
    formData.append('file', file.file)
    // 统一调用通用的 /upload/image 接口 (已后端升级支持视频)
    const res = await request.post('/upload/image?type=order_proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    if (type === 'cleaning') {
      catChecklist[type].push(res.url)
    } else {
      catChecklist[type] = res.url
    }
    await syncCatChecklist() // 立即同步到服务器
    showSuccessToast('上传成功')
  } catch (e) {
    showToast('上传失败')
  }
}

// 新增：喂猫专项存证实时同步到服务器 (持久化)
const syncCatChecklist = async () => {
  try {
    await request.put(`/orders/${order.value.id}/service-records`, {
      proof_data: {
        entry: { video: catChecklist.plateVideo, images: [] },
        environment: { video: null, images: catChecklist.cleaning },
        interaction: { video: catChecklist.feedingVideo, images: [] }
      }
    })
    console.log('>> [CatSync] 存证已实时持久化到服务器');
  } catch (e) {
    console.error('喂猫存证同步失败:', e)
  }
}

// 遛狗专项存证上传
const uploadWalkingProof = async (fileData, type) => {
  const files = Array.isArray(fileData) ? fileData : [fileData]
  
  const hasVideo = files.some(f => f.file.type.includes('video'))
  if (hasVideo) showLoadingToast({ message: '正在上传视频...', forbidClick: true })

  try {
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file.file)
      const res = await request.post('/upload/image?type=order_proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (type === 'walking_proof') {
        // 记录上传时的 LBS 坐标 (封装为 Promise 确保顺序)
        const getPos = () => new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null)
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
            () => resolve(null),
            { timeout: 5000 }
          )
        })

        const currentPos = await getPos()
        walkingChecklist.walking_proof.push({ 
          url: res.url, 
          location: currentPos, 
          time: new Date() 
        })
      } else {
        walkingChecklist[type] = res.url
      }
    }
    
    // 所有文件上传完成后同步到服务器
    await syncWalkingChecklist()
    showSuccessToast('上传成功')
  } catch (e) {
    console.error('上传失败:', e)
    showToast('上传失败')
  }
}

// 遛狗专项存证实时同步到服务器 (持久化)
const syncWalkingChecklist = async () => {
  try {
    const proofData = {
      entry_proof: walkingChecklist.entry_proof,
      walking_proof: walkingChecklist.walking_proof,
      exit_proof: walkingChecklist.exit_proof,
      trajectory: walkingChecklist.trajectory // 补全轨迹同步，防止覆盖丢失
    }
    console.log('>> [WalkingSync] 开始同步存证:', proofData);
    await request.put(`/orders/${order.value.id}/service-records`, {
      proof_data: proofData
    })
    console.log('>> [WalkingSync] 存证已同步成功');
  } catch (e) {
    console.error('存证同步失败:', e)
  }
}

const showCompletePopup = ref(false)
const showAdvicePopup = ref(false)
const showBillPopup = ref(false)
const showDrugPopup = ref(false)
const medicalAdvice = ref('')
const medicalAdviceFiles = ref([])
const billFiles = ref([])
const drugRemindText = ref('')
const drugFiles = ref([])
const showGroceryPopup = ref(false)
const groceryForm = reactive({
  actualAmount: '',
  receiptFiles: [],
  weighingFiles: []
})
const submitting = ref(false)

const servingSeconds = ref(0)
let servingTimer = null

const servingTimeDisplay = computed(() => {
  const h = Math.floor(servingSeconds.value / 3600)
  const m = Math.floor((servingSeconds.value % 3600) / 60)
  const s = servingSeconds.value % 60
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const walkingTimeDisplay = computed(() => {
  const h = Math.floor(walkingDuration.value / 3600)
  const m = Math.floor((walkingDuration.value % 3600) / 60)
  const s = walkingDuration.value % 60
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const startServingTimer = () => {
  if (order.value.started_at) {
    // 核心校准：使用服务端返回的 current_total_duration
    servingSeconds.value = order.value.current_total_duration || 0;
    
    if (!servingTimer) {
      servingTimer = setInterval(() => {
        servingSeconds.value++
      }, 1000)
    }
  }
}

const showShareSheet = ref(false)
const shareOptions = [
  { name: '微信', icon: 'wechat' },
  { name: '复制链接', icon: 'link' }
]
const onShareSelect = (option) => {
  showToast(`已选择: ${option.name}`)
  showShareSheet.value = false
}

const isSyncing = ref(false)

// 大厂级方案：静默增量同步逻辑 (原子化增强)
const autoSyncRecords = async () => {
  if (order.value.status !== 2) return // 仅在服务中同步
  
  try {
    isSyncing.value = true
    const images = medicalAdviceFiles.value.filter(f => f.status === 'done').map(f => f.url || f.content)
    const billImgs = billFiles.value.filter(f => f.status === 'done').map(f => f.url || f.content)
    const drugImgs = drugFiles.value.filter(f => f.status === 'done').map(f => f.url || f.content)
    
    const syncData = {
      medicalAdviceText: medicalAdvice.value,
      medicalAdviceImages: images,
      billImages: billImgs,
      medicationReminderText: drugRemindText.value,
      medicationReminderImages: drugImgs
    }

    // 增加本地草稿备份，防止网络彻底断开
    localStorage.setItem(`order_draft_${order.value.id}`, JSON.stringify(syncData))
    
    await request.put(`/orders/${order.value.id}/service-records`, syncData)
    console.log('>> [AutoSync] 记录已原子级同步到云端');
  } catch (e) {
    console.error('自动同步失败:', e)
  } finally {
    isSyncing.value = false
  }
}

// 简易防抖实现 (避免引入额外库)
let syncTimer = null
const debouncedSync = () => {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(autoSyncRecords, 2000)
}

// 监听所有核心录入字段的变化，触发自动同步 (原子级增强)
watch([medicalAdvice, drugRemindText, medicalAdviceFiles, billFiles, drugFiles], () => {
  debouncedSync()
}, { deep: true })

const saveMedicalAdvice = async () => {
  if (!medicalAdvice.value) return showToast('请输入医嘱内容')
  await autoSyncRecords()
  showSuccessToast('医嘱已记录')
  showAdvicePopup.value = false
}

const saveBillPhotos = async () => {
  if (billFiles.value.length === 0) return showToast('请上传账单照片')
  await autoSyncRecords()
  showSuccessToast('账单已上传')
  showBillPopup.value = false
}

const saveDrugRemind = async () => {
  if (!drugRemindText.value) return showToast('请输入提醒内容')
  await autoSyncRecords()
  showSuccessToast('提醒已设置')
  showDrugPopup.value = false
}

const saveGroceryProof = async () => {
  if (!groceryForm.actualAmount) return showToast('请输入买菜总支出')
  if (groceryForm.receiptFiles.length === 0) return showToast('请上传支付记录照片')
  
  try {
    submitting.value = true
    const receiptImgs = groceryForm.receiptFiles.filter(f => f.status === 'done').map(f => f.url)
    const weighingVideos = groceryForm.weighingFiles.filter(f => f.status === 'done').map(f => f.url)
    
    const syncData = {
      groceryActualAmount: groceryForm.actualAmount,
      receiptImage: JSON.stringify(receiptImgs),
      weighingVideo: weighingVideos[0] || null,
      groceryStatus: 1
    }
    
    await request.put(`/orders/${order.value.id}/service-records`, syncData)
    showSuccessToast('存证已同步')
    showGroceryPopup.value = false
    loadData()
  } catch (e) {
    showToast('同步失败')
  } finally {
    submitting.value = false
  }
}

const handleShareProgress = () => {
  showShareSheet.value = true
}

const proofFiles = ref([])
const selectedTags = ref([])

const toggleTag = (tag) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 核心逻辑：根据服务类型动态生成完成项标签
const completionTags = computed(() => {
  const name = order.value.service_name || ''
  
  if (name.includes('陪诊') || name.includes('陪护')) {
    return [
      '就诊医嘱已录入',
      '费用账单已上传',
      '陪同检查已完成',
      '取药代办已完成',
      '用药嘱托已同步',
      '安全送走/交代完成'
    ]
  } else if (name.includes('遛狗')) {
    // 周期单子项展示新规范标签，普通单保留原有业务逻辑
    if (order.value.parent_recurring_id || order.value.order_type === 1) {
      return ['门牌号/入场录像', '铲屎/换水/清扫', '15秒喂食/互动视频', '宠物状态确认', '安全离场']
    }
    return [
      '已佩戴牵引绳',
      '宠物情绪稳定',
      '便溺及时清理',
      '行走轨迹完整',
      '足部清洁完成',
      '安全送回客户家'
    ]
  } else if (name.includes('猫') || name.includes('喂养') || name.includes('宠物')) {
    // 周期单子项展示新规范标签，普通单保留原有业务逻辑
    if (order.value.parent_recurring_id || order.value.order_type === 1) {
      return ['门牌号/入场录像', '铲屎/换水/清扫', '15秒喂食/互动视频', '宠物状态确认', '安全离场']
    }
    return [
      '已到达目的地',
      '宠物状态良好',
      '环境卫生已清理',
      '加粮/换水已完成',
      '互动视频已发送'
    ]
  } else if (name.includes('做饭') || name.includes('厨')) {
    return [
      '食材已核对',
      '灶台卫生已清理',
      '厨余垃圾已带走',
      '口味确认满意',
      '安全离场'
    ]
  }
  
  // 兜底通用标签
  return [
    '服务项目已核对',
    '现场环境已清理',
    '客户特殊叮嘱已办妥',
    '安全离场'
  ]
})

const walkingDuration = ref(0)
let durationTimer = null
let liveTimer = null
let reportTimer = null // 轨迹上报定时器
let trackMap = null
let trackPolyline = null
let trackMarker = null
let startMarker = null
let endMarker = null
let selfMarker = null
let selfWatchId = null

// 核心：遛狗轨迹上报逻辑
const handleWalking = async (isStart) => {
  const actionText = isStart ? '开始遛狗' : '结束遛狗'
  showConfirmDialog({ message: `确定要${actionText}吗？` }).then(async () => {
    try {
      showLoadingToast({ message: '同步中...', forbidClick: true })
      
      // 调用后端同步接口
      await request.put(`/orders/${order.value.id}/sync-track`, {
        isWalking: isStart
      })
      
      showSuccessToast(`${actionText}成功`)
      
      if (isStart) {
        startTrackReporting()
      } else {
        stopTrackReporting()
      }
      
      loadData()
    } catch (e) {
      showToast('操作失败')
    }
  })
}

const startTrackReporting = () => {
  if (reportTimer) return
  // 每10秒上报一次坐标 (根据最新要求从30秒调整为10秒)
  reportTimer = setInterval(reportCurrentLocation, 10000)
}

const stopTrackReporting = () => {
  if (reportTimer) {
    clearInterval(reportTimer)
    reportTimer = null
  }
}

// 实时获取自身位置并绘制蓝点 (原子级增强)
const startSelfLocating = () => {
  if (!navigator.geolocation || selfWatchId) return
  selfWatchId = navigator.geolocation.watchPosition((pos) => {
    const point = [pos.coords.longitude, pos.coords.latitude]
    if (trackMap) {
      if (!selfMarker) {
        selfMarker = new AMap.Marker({
          position: point,
          content: '<div class="self-location-dot" style="width: 16px; height: 16px; background: #007aff; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 8px rgba(0,122,255,0.4); animation: breathe 2s infinite;"></div>',
          offset: new AMap.Pixel(-8, -8),
          zIndex: 120
        })
        trackMap.add(selfMarker)
      } else {
        selfMarker.setPosition(point)
      }
    }
  }, (err) => console.warn('SelfLocate Error:', err), { enableHighAccuracy: true })
}

const stopSelfLocating = () => {
  if (selfWatchId) {
    navigator.geolocation.clearWatch(selfWatchId)
    selfWatchId = null
  }
  if (selfMarker && trackMap) {
    trackMap.remove(selfMarker)
    selfMarker = null
  }
}

const reportCurrentLocation = () => {
  if (!navigator.geolocation || order.value.is_walking !== 1) return
  
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { longitude, latitude } = pos.coords
    const point = [longitude, latitude]
    
    // 实时存入本地数组
    walkingChecklist.trajectory.push(point)
    
    try {
      // 1. 先存入本地待传队列
      const pendingPoints = JSON.parse(localStorage.getItem(`pending_points_${order.value.id}`) || '[]')
      pendingPoints.push(point)
      
      // 2. 尝试同步整个队列到后端
      const currentPoints = parseJSON(order.value.live_track || '[]')
      const allPoints = [...currentPoints, ...pendingPoints]
      
      await request.put(`/orders/${order.value.id}/sync-track`, {
        points: allPoints
      })
      
      // 3. 同步成功，清空本地队列
      localStorage.removeItem(`pending_points_${order.value.id}`)
      order.value.live_track = JSON.stringify(allPoints)
      initTrackMap()
    } catch (e) {
      // 同步失败，保留在本地队列，下次重试
      console.warn('轨迹同步失败，已存入本地待传队列')
      localStorage.setItem(`pending_points_${order.value.id}`, JSON.stringify(pendingPoints))
    }
  }, (err) => {
    console.error('GPS 获取失败:', err)
  }, { enableHighAccuracy: true })
}

const initTrackMap = async () => {
  const points = parseJSON(order.value.service_track || order.value.live_track)
  await loadAMap()
  
  // 核心：强制转换坐标为数字，防止 AMap 报错
  const lng = Number(order.value.service_longitude)
  const lat = Number(order.value.service_latitude)
  const defaultCenter = (lng && lat) ? [lng, lat] : [116.397428, 39.90923]

  await nextTick()

  let mapEl = document.getElementById('track-map-dashboard')
  if (!mapEl) {
    // 增加二次等待，确保动态渲染的 DOM 已就绪
    await new Promise(resolve => setTimeout(resolve, 600))
    mapEl = document.getElementById('track-map-dashboard')
  }

  if (!mapEl) return

  // 关键：检测并销毁失效的地图实例容器
  if (trackMap) {
    const oldContainer = trackMap.getContainer()
    if (!oldContainer || !document.body.contains(oldContainer)) {
      trackMap.destroy()
      trackMap = null
    }
  }

  if (!trackMap) {
    trackMap = new AMap.Map(mapEl, {
      zoom: 16,
      center: (points && points.length > 0) ? points[points.length - 1] : defaultCenter,
      viewMode: '2D'
    })
  } else {
    trackMap.setCenter((points && points.length > 0) ? points[points.length - 1] : defaultCenter)
  }

  // 如果没有轨迹点，在服务中心显示一个等待标记
  if (!points || points.length === 0) {
    if (trackMarker) trackMap.remove(trackMarker)
    trackMarker = new AMap.Marker({ 
      position: defaultCenter, 
      content: '<div style="width: 14px; height: 14px; background: #11998e; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 4px rgba(17, 153, 142, 0.2);"></div>', 
      offset: new AMap.Pixel(-7, -7) 
    })
    trackMap.add(trackMarker)
    return
  }

  // 移除旧标记（如果存在）防止实例冲突
  if (startMarker) trackMap.remove(startMarker)
  if (endMarker) trackMap.remove(endMarker)

  // 1. 绘制起点
  startMarker = new AMap.Marker({
    position: points[0],
    icon: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png',
    offset: new AMap.Pixel(-13, -30),
    zIndex: 100
  })
  trackMap.add(startMarker)

  // 2. 绘制/更新当前位置(狗头) 或 终点
  if (order.value.status === 2) {
    // 服务中：显示狗头
    if (trackMarker) {
      trackMarker.setPosition(points[points.length - 1])
      // 确保它在当前地图上 (防止地图销毁重建后引用失效)
      if (!trackMap.getAllOverlays('marker').includes(trackMarker)) {
        trackMap.add(trackMarker)
      }
    } else {
      trackMarker = new AMap.Marker({
        position: points[points.length - 1],
        content: '<div style="font-size: 32px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15)); cursor: pointer;">🐶</div>',
        offset: new AMap.Pixel(-16, -16),
        zIndex: 110
      })
      trackMap.add(trackMarker)
    }
  } else {
    // 已完成：显示终点，移除狗头
    if (trackMarker) {
      trackMap.remove(trackMarker)
      trackMarker = null
    }
    endMarker = new AMap.Marker({
      position: points[points.length - 1],
      icon: 'https://webapi.amap.com/theme/v1.3/markers/n/end.png',
      offset: new AMap.Pixel(-13, -30),
      zIndex: 100
    })
    trackMap.add(endMarker)
  }

  // 3. 绘制/更新轨迹线
  if (trackPolyline) {
    trackPolyline.setPath(points)
    // 确保线在图上
    if (!trackMap.getAllOverlays('polyline').includes(trackPolyline)) {
      trackMap.add(trackPolyline)
    }
  } else {
    trackPolyline = new AMap.Polyline({
      path: points,
      showDir: true,
      strokeColor: '#52c41a',
      strokeWeight: 6,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      zIndex: 50
    })
    trackMap.add(trackPolyline)
  }

  trackMap.setFitView([trackPolyline], false, [60, 60, 60, 60])
}

// 监听订单数据变化，动态初始化地图
watch(() => order.value.id, (newId) => {
  if (newId && isTrackService.value) {
    setTimeout(initTrackMap, 600)
  }
})

// 监听状态变化，确保在进入服务中状态时地图能加载
watch(() => order.value.status, (newStatus) => {
  if (newStatus === 2 && isTrackService.value) {
    setTimeout(initTrackMap, 600)
  }
})

const loadData = async () => {
  try {
    const id = route.params.id
    
    let data
    
    // 周期单场次：调用专用接口
    if (isRecurringSession.value) {
      const res = await request.get(`/recurring/session/${id}`)
      data = res.data || res
      console.log('>> [OrderDetail] Recurring Session Loaded:', data);
    } else {
      // 普通订单：调用原接口
      data = await getOrderDetail(id)
      
      // 核心分流逻辑：如果是周期单母单，自动跳转到周期单详情页
      if (data && data.order_type === 1 && !data.parent_recurring_id) {
        return router.replace({ name: 'RecurringOrderDetail', params: { id } })
      }
      console.log('>> [OrderDetail] Data Loaded:', data);
    }
    
    if (data) {
      order.value = data
      
      // 启动服务计时器
      if (order.value.status === 2) {
        startServingTimer()
      } else if (servingTimer) {
        clearInterval(servingTimer)
        servingTimer = null
      }
      
      // 回填已保存的记录
      medicalAdvice.value = data.medical_advice_text || ''
      drugRemindText.value = data.medication_reminder_text || ''
      
      if (data.medical_advice_images) {
        const imgs = typeof data.medical_advice_images === 'string' ? JSON.parse(data.medical_advice_images) : data.medical_advice_images
        medicalAdviceFiles.value = imgs.map(url => ({ url, status: 'done' }))
      }
      if (data.bill_images) {
        const imgs = typeof data.bill_images === 'string' ? JSON.parse(data.bill_images) : data.bill_images
        billFiles.value = imgs.map(url => ({ url, status: 'done' }))
      }
      if (data.medication_reminder_images) {
        const imgs = typeof data.medication_reminder_images === 'string' ? JSON.parse(data.medication_reminder_images) : data.medication_reminder_images
        drugFiles.value = imgs.map(url => ({ url, status: 'done' }))
      }

      // 回填买菜存证
      if (data.grocery_actual_amount) {
        groceryForm.actualAmount = data.grocery_actual_amount
        if (data.receipt_image) {
          const imgs = typeof data.receipt_image === 'string' ? JSON.parse(data.receipt_image) : data.receipt_image
          groceryForm.receiptFiles = Array.isArray(imgs) ? imgs.map(url => ({ url, status: 'done' })) : [{ url: imgs, status: 'done' }]
        }
        if (data.weighing_video) {
          groceryForm.weighingFiles = [{ url: data.weighing_video, status: 'done' }]
        }
      }
      
      // 核心：如果 schedules 是字符串，尝试解析它
      if (typeof order.value.schedules === 'string') {
        try {
          order.value.schedules = JSON.parse(order.value.schedules)
        } catch (e) {
          console.error('解析 schedules 失败:', e)
        }
      }

      // 核心修复：直接使用 data.service_id 防止 computed 延迟导致的业务识别失效
      const actualServiceId = Number(data.service_id)
      if (actualServiceId === 36 && data.proof_data) {
        const pd = typeof data.proof_data === 'string' ? JSON.parse(data.proof_data) : data.proof_data
        walkingChecklist.entry_proof = pd.entry_proof || null
        walkingChecklist.walking_proof = Array.isArray(pd.walking_proof) ? pd.walking_proof : []
        walkingChecklist.exit_proof = pd.exit_proof || null
        walkingChecklist.trajectory = Array.isArray(pd.trajectory) ? pd.trajectory : []
        console.log('>> [WalkingBackfill] 存证数据已回填:', walkingChecklist);
      } else if (actualServiceId === 37 && data.proof_data) {
        const pd = typeof data.proof_data === 'string' ? JSON.parse(data.proof_data) : data.proof_data
        catChecklist.plateVideo = pd.entry?.video || null
        catChecklist.cleaning = Array.isArray(pd.environment?.images) ? pd.environment.images : []
        catChecklist.feedingVideo = pd.interaction?.video || null
        console.log('>> [CatBackfill] 存证数据已回填:', catChecklist);
      }
      
      // 处理遛狗轨迹和时长
      if (isTrackService.value) {
        setTimeout(initTrackMap, 800) // 增加延迟，确保 ResultDashboard 已经渲染
        
        // 核心校准：专项遛狗时长以服务端为准
        walkingDuration.value = Number(order.value.current_walking_duration || 0);
        
        // 开启/关闭时长计时器
        if (order.value.is_walking === 1) {
          if (!durationTimer) {
            durationTimer = setInterval(() => {
              walkingDuration.value++;
            }, 1000)
          }
          // 核心修复：刷新页面后自动恢复轨迹上报
          startTrackReporting()
          startSelfLocating()
        } else {
          // 核心修复：如果已结束遛狗，必须彻底清除计时器，否则数值会继续累加
          if (durationTimer) {
            clearInterval(durationTimer)
            durationTimer = null
          }
        }

        // 如果在服务中，开启轮询同步轨迹
        if (order.value.status === 2 && !liveTimer) {
          liveTimer = setInterval(async () => {
            const freshData = await getOrderDetail(id)
            if (freshData) {
              order.value = freshData
              // 每次轮询都强制校准两个时长
              servingSeconds.value = Number(order.value.current_total_duration || 0)
              walkingDuration.value = Number(order.value.current_walking_duration || 0)
              initTrackMap()
            }
          }, 15000)
        }
      }
    } else {
      showToast('未找到订单数据')
    }
  } catch (e) {
    console.error('>> [OrderDetail] Load Error:', e);
    showToast('加载失败')
  }
}

const expandMap = () => {
  showToast('正在放大地图...')
}

const hidePhone = (p) => p ? p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''

// 模拟导航
const handleNavigation = () => {
  showToast({ message: '正在启动高德地图...', icon: 'guide-o' })
}

const parseJSON = (str) => {
  if (!str || str === 'null') return []
  if (typeof str !== 'string') return Array.isArray(str) ? str : []
  try {
    const res = JSON.parse(str)
    return Array.isArray(res) ? res : []
  } catch (e) {
    return []
  }
}

onMounted(() => {
  loadData()
  // 核心加固：监听 WebSocket 触发的全局刷新事件 (含 ID 路由校验)
  window.addEventListener('order-refresh', (e) => {
    if (e.detail && (e.detail.isReconnect || String(e.detail.orderId) === String(route.params.id))) {
      console.log(`>> [Provider/Detail] 匹配到当前订单或重连同步，执行刷新: ${route.params.id}`);
      loadData();
    }
  })

  // 监听订单状态变更事件 (Socket 驱动自动切页)
  window.addEventListener('ORDER_STATUS_CHANGE', (e) => {
    if (e.detail && String(e.detail.orderId) === String(route.params.id)) {
      console.log(`>> [Provider/Status] 状态变更，自动刷新页面: ${route.params.id}`);
      loadData();
    }
  })

  // 新增：直接 Socket 监听 (仅刷新数据，通知由 App.vue 处理)
  socket.on('order_status_update', (data) => {
    if (String(data.orderId) === String(route.params.id)) {
      console.log('>> [Provider/Socket] Order Update - Refreshing Detail:', data)
      loadData()
    }
  })
})

onUnmounted(() => {
  if (durationTimer) clearInterval(durationTimer)
  if (liveTimer) clearInterval(liveTimer)
  stopTrackReporting()
  stopSelfLocating()
  if (selfWatchId) navigator.geolocation.clearWatch(selfWatchId)
  if (trackMap) {
    trackMap.destroy()
    trackMap = null
  }
  // 核心加固：移除监听
  window.removeEventListener('order-refresh', loadData)
  window.removeEventListener('ORDER_STATUS_CHANGE', loadData)

  // 清理Socket监听
  socket.off('order_status_update')
})

const handleAcceptOrder = () => {
  showConfirmDialog({
    title: '确认接单',
    message: '接单后请务必按时提供服务。',
    confirmButtonColor: '#52c41a'
  }).then(async () => {
    try {
      await acceptOrder(order.value.id)
      showSuccessToast('接单成功！')
      loadData()
    } catch (e) {
      console.error('接单失败:', e)
    }
  }).catch(() => {})
}

const handleCancelResponse = (action) => {
  const title = action === 'agree' ? '同意取消' : '拒绝取消'
  const message = action === 'agree' ? '同意后订单将立即取消并退款给用户，确定吗？' : '拒绝后订单将恢复原状态，确定吗？'
  
  showConfirmDialog({ title, message }).then(async () => {
    try {
      await request.put(`/orders/${order.value.id}/handle-cancel-response`, { action })
      showSuccessToast('操作成功')
      loadData()
    } catch (e) {
      showToast(e.response?.data?.message || '操作失败')
    }
  })
}

const handleStatusUpdate = (status) => {
  let title = '确认操作'
  let message = '确认更新订单状态吗？'
  let confirmText = '确认'
  
  if (status === 2) {
    const name = order.value.service_name || ''
    const isPetService = name.includes('遛狗') || name.includes('喂猫') || name.includes('猫') || name.includes('狗')
    
    title = '开始服务'
    confirmText = '确认开始'
    
    if (isPetService) {
      if (serviceId.value === 36 && !walkingChecklist.entry_proof) {
        // 核心改动：不再直接拦截提示，而是弹出视频上传弹窗
        showEntryProofPopup.value = true
        return
      }
      message = '您已接到宠物，确认开始本次服务吗？'
    } else {
      message = '您已到达目的地并见到客户，确认开始本次服务吗？'
    }
  }
  
  showConfirmDialog({
    title,
    message,
    confirmButtonText: confirmText,
    confirmButtonColor: '#11998e'
  }).then(async () => {
    const extraData = {}
    if (status === 2 && serviceId.value === 36) {
      extraData.proof_data = { entry_proof: walkingChecklist.entry_proof }
      // 核心：操作成功后立即关闭弹窗
      showEntryProofPopup.value = false
    }

    // 分构重构：现在每一个场次都是真实的订单，直接调用统一接口即可
    try {
      await updateOrderStatus(order.value.id, status, extraData)
      showToast('操作成功')
      loadData()
    } catch (e) {
      console.error('>> [OrderDetail] Status Update Error:', e);
      showToast(e.message || '操作失败')
    }
  })
}

const handlePrivacyCall = () => {
  if (!order.value.contact_phone) return showToast('暂无联系方式')
  showConfirmDialog({
    title: '虚拟号通话',
    message: '正在为您呼叫客户隐私虚拟号，通话过程可能会被录音以保障双方权益。',
    confirmButtonText: '立即呼叫',
    confirmButtonColor: '#52c41a'
  }).then(() => {
    window.location.href = `tel:${order.value.contact_phone}`
  })
}

const goToChat = () => {
  router.push({
    path: '/chat',
    query: {
      targetId: order.value.user_id,
      targetName: order.value.contact_name,
      orderId: order.value.id
    }
  })
}

// Socket通知助手函数
const showNotification = (title, message, type = 'info') => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  const vnode = h(NotificationCard, {
    type,
    title,
    message,
    duration: 5000,
    onClick: () => {
      loadData()
    },
    onClose: () => {
      render(null, container)
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }
  })
  
  render(vnode, container)
}

const socket = useSocket()

// 补全缺失的“完成服务”逻辑
const openCompletePopup = () => {
  // 核心拦截：点击完成前先检查陪诊必备记录
  if (order.value.service_name?.includes('陪诊')) {
    if (!medicalAdvice.value) {
      return showToast('请先在工作台录入医嘱')
    }
    if (billFiles.value.length === 0) {
      return showToast('请先在工作台上传账单')
    }
    if (!drugRemindText.value) {
      return showToast('请先在工作台设置用药提醒')
    }
  }

  // 喂猫专项逻辑 (ID 37) 强制清单校验
  if (serviceId.value === 37) {
    if (!catChecklist.plateVideo) return showToast('请先上传门牌/入场视频')
    if (!catChecklist.cleaning) return showToast('请先上传环境清理照片')
    if (!catChecklist.feedingVideo) return showToast('请先上传喂食互动视频')
  }

  showCompletePopup.value = true
}

const afterReadProof = async (file) => {
  file.status = 'uploading'
  file.message = '上传中...'
  
  try {
    const formData = new FormData()
    formData.append('file', file.file)
    const res = await request.post('/upload/image?type=order_proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    file.status = 'done'
    file.url = res.url
    
    // 原子级增强：图片上传成功后立即触发云端同步
    autoSyncRecords()
  } catch (e) {
    file.status = 'failed'
    file.message = '上传失败'
  }
}

const handleCompleteSubmit = async () => {
  // 核心校验：如果是陪诊服务，必须完成三项专业记录
  if (order.value.service_name?.includes('陪诊')) {
    if (!medicalAdvice.value) {
      return showToast({ message: '请先录入医生医嘱', position: 'bottom' })
    }
    if (billFiles.value.length === 0) {
      return showToast({ message: '请上传费用账单照片', position: 'bottom' })
    }
    if (!drugRemindText.value) {
      return showToast({ message: '请设置用药提醒', position: 'bottom' })
    }
  }

  // 核心校验逻辑重构
  if (serviceId.value === 36) {
    // 遛狗业务：校验过程存证
    if (walkingChecklist.walking_proof.length === 0) {
      return showToast('请先在工作台拍摄遛狗过程照片')
    }
  } else if (serviceId.value === 37) {
    // 喂猫业务：校验过程存证
    if (catChecklist.cleaning.length === 0) {
      return showToast('请先在工作台拍摄环境清理照片')
    }
  } else {
    // 其他业务：校验手动上传是否为空
    const manualImages = proofFiles.value.filter(f => f.status === 'done').map(f => f.url);
    if (manualImages.length === 0) {
      return showToast('请至少上传一张服务照片')
    }
  }

  if (selectedTags.value.length === 0) {
    return showToast('请选择服务完成标签')
  }

  if (order.value.order_type === 1 && order.value.completed_count < order.value.total_count) {
    showConfirmDialog({
      title: '周期未完成',
      message: `当前周期单仅完成 ${order.value.completed_count}/${order.value.total_count} 次，确定要提前结束整个订单吗？提前结束将无法继续打卡。`,
      confirmButtonText: '确定结束',
      cancelButtonText: '继续打卡',
      confirmButtonColor: '#ee0a24'
    }).then(async () => {
      executeCompleteSubmit()
    }).catch(() => {
      // 用户点击了“继续打卡”，关闭报告弹窗，方便用户去列表找打卡按钮
      showCompletePopup.value = false
    })
    return
  }

  executeCompleteSubmit()
}

const executeCompleteSubmit = async () => {
  try {
    submitting.value = true
    
    // 核心：根据业务类型聚合最终的 proofImages
    const manualImages = proofFiles.value.filter(f => f.status === 'done').map(f => f.url);
    let finalProofImages = [...manualImages];

    if (serviceId.value === 36) {
      // 遛狗业务：合并过程照片
      const processImages = walkingChecklist.walking_proof.map(p => p.url);
      finalProofImages = Array.from(new Set([...processImages, ...manualImages]));
    } else if (serviceId.value === 37) {
      // 喂猫业务：合并过程照片 (环境清理)
      finalProofImages = Array.from(new Set([...catChecklist.cleaning, ...manualImages]));
    }
    
    // 商业化增强：如果是遛狗服务，提交时带上最终轨迹
    const extraData = { 
      proofImages: finalProofImages,
      completionTags: selectedTags.value
    }
    
    // 喂猫专项：结构化凭证数据
    if (serviceId.value === 37) {
      extraData.proof_data = {
        entry: { video: catChecklist.plateVideo, images: [] },
        environment: { video: null, images: catChecklist.cleaning },
        interaction: { video: catChecklist.feedingVideo, images: [] }
      }
    }

    // 遛狗专项：结构化凭证与轨迹数据 (加固：只增不减)
    if (serviceId.value === 36) {
      if (!walkingChecklist.exit_proof) {
        submitting.value = false
        return showToast('请先上传送回/离场视频凭证')
      }
      
      // 读取后端原始数据中的存证 (防止误覆盖丢失历史视频)
      const rawProofData = order.value.proof_data ? (typeof order.value.proof_data === 'string' ? JSON.parse(order.value.proof_data) : order.value.proof_data) : {};

      extraData.proof_data = {
        entry_proof: walkingChecklist.entry_proof || rawProofData.entry_proof, // 如果本地丢失，回退使用数据库已有的
        walking_proof: walkingChecklist.walking_proof.length > 0 ? walkingChecklist.walking_proof : rawProofData.walking_proof,
        exit_proof: walkingChecklist.exit_proof || rawProofData.exit_proof,
        trajectory: walkingChecklist.trajectory.length > 0 ? walkingChecklist.trajectory : (parseJSON(order.value.live_track) || rawProofData.trajectory || [])
      }
      
      // 容错处理：轨迹不完整备注
      if (extraData.proof_data.trajectory.length < 2) {
        extraData.remark = (order.value.remark || '') + ' [系统提示：轨迹采集不完整]'
      }
    }
    
    if (isTrackService.value) {
      extraData.serviceTrack = order.value.live_track || []
    }
    
    await updateOrderStatus(order.value.id, 3, extraData)
    
    showSuccessToast('服务已完成')
    showCompletePopup.value = false
    loadData()
  } catch (e) {
    showToast('提交失败')
  } finally {
    submitting.value = false
  }
}

const getStatusText = (s) => ['待接单', '已接单', '服务中', '已完成', '已取消', '已评价', '', '', '', '', '', '已到达', '协商取消中'][s]
const getStatusIcon = (s) => {
  const map = { 0: 'clock-o', 1: 'logistics', 2: 'play-circle-o', 3: 'passed', 4: 'close', 5: 'passed', 11: 'location-o', 12: 'question-o' }
  return map[s] || 'question-o'
}
const formatDate = (date) => date ? new Date(date).toLocaleString() : ''
const formatDateShort = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const isTrackService = computed(() => order.value.service_name?.includes('遛狗'))

// --- 极简奢华 UI 逻辑驱动样式 (遵循零 CSS 修改原则) ---

// 1. 动态沉浸式背景
const heroStyle = computed(() => {
  const status = order.value.status;
  let gradient = 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'; // 默认蓝
  if (status === 2) gradient = 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)'; // 服务中橙
  else if (status === 3 || status === 5) gradient = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'; // 完成绿
  else if (status === 4) gradient = 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)'; // 取消灰
  else if (status === 12) gradient = 'linear-gradient(135deg, #636e72 0%, #2d3436 100%)'; // 协商中灰

  return {
    background: gradient,
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden'
  };
});

// 2. 报酬卡片微深度设计
const earningsCardStyle = computed(() => ({
  background: '#fff',
  borderRadius: '24px',
  padding: '28px 24px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.02)',
  border: '1px solid rgba(239, 68, 68, 0.05)',
  textAlign: 'center',
  position: 'relative',
  zIndex: 10
}));

// 3. 业务卡片侧边条逻辑
const businessCardStyle = (type) => {
  const colors = {
    medical: '#ef4444',
    pet: '#7c3aed',
    home: '#10b981'
  };
  return {
    borderLeft: `5px solid ${colors[type] || '#eee'}`,
    paddingLeft: '20px'
  };
};

// 4. 标签等宽对齐间距
const labelStyle = {
  letterSpacing: '1px',
  textTransform: 'uppercase',
  opacity: 0.8
};

const isToday = (dateStr) => {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() &&
         d.getMonth() === today.getMonth() &&
         d.getDate() === today.getDate()
}

const showPunchPopup = ref(false)
const currentPunchItem = ref(null)
const punchFiles = ref([])
const showEntryProofPopup = ref(false)

const handleSchedulePunch = (item) => {
  currentPunchItem.value = item
  punchFiles.value = []
  showPunchPopup.value = true
}

const handlePunchSubmit = async () => {
  if (punchFiles.value.length === 0) {
    return showToast('请上传今日服务照片')
  }

  try {
    submitting.value = true
    const proofImages = punchFiles.value.filter(f => f.status === 'done').map(f => f.url)
    
    await request.put(`/orders/schedule/${currentPunchItem.value.id}/status`, {
      status: 1,
      proofImages: proofImages
    })
    
    showSuccessToast('今日打卡成功')
    showPunchPopup.value = false
    loadData()
  } catch (e) {
    showToast('打卡失败')
  } finally {
    submitting.value = false
  }
}

const previewProof = (images) => {
  const imgs = parseJSON(images)
  if (imgs && imgs.length > 0) {
    showImagePreview(imgs)
  }
}

const scrollToSchedules = () => {
  const el = document.querySelector('.timeline-track')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    showToast('请在下方列表点击“今日打卡”')
  }
}
</script>

<style scoped>
.minimal-nav {
  z-index: 100 !important;
  background: white !important;
}

.order-detail-page { min-height: 100vh; background: #ffffff; padding-bottom: 120px; }

/* 1. 品牌感英雄区 - 状态渐进色 */
.brand-hero {
  padding: 60px 24px 80px;
  color: white;
  position: relative;
  transition: background 0.4s ease;
}

/* 状态渐进色：待接单(蓝) -> 服务中(橙) -> 已完成(绿) */
.hero-status-0 { background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%); } /* 待接单 */
.hero-status-1 { background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%); } /* 已接单 */
.hero-status-2 { background: linear-gradient(135deg, #f2994a 0%, #f2c94c 100%); } /* 服务中 */
.hero-status-3, .hero-status-5 { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); } /* 已完成/已评价 */
.hero-status-4 { background: linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%); } /* 已取消 */

.hero-content { position: relative; z-index: 2; }
.status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.status-main { display: flex; align-items: center; gap: 12px; }
.status-icon-anim { font-size: 28px; color: white; }
.status-text { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; color: white; }
.order-id { font-size: 12px; color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 8px; backdrop-filter: blur(4px); }
.status-desc { font-size: 14px; color: rgba(255,255,255,0.9); margin-top: 8px; font-weight: 500; }
.timer-bold { font-weight: 900; font-family: 'DIN Alternate'; font-size: 18px; margin: 0 4px; color: #fff; }

.w-icon-pulse {
  animation: pulse-icon 2s infinite;
}
@keyframes pulse-icon {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}

.pulse-tag {
  animation: pulse-opacity 2s infinite;
}
@keyframes pulse-opacity {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* 3. 陪诊工作台专有样式 */
.workspace-card {
  border: 2px solid #11998e;
  box-shadow: 0 12px 30px rgba(17, 153, 142, 0.15);
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
  transition: all 0.3s;
}

.sync-indicator.is-syncing {
  color: #11998e;
}

.sync-indicator.is-syncing i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.history-item {
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
}
.h-l {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: bold;
}
.h-v {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.5;
  font-weight: 500;
}

.hero-arc {
  position: absolute; bottom: 0; left: 0; right: 0; height: 30px;
  background: #f4f7f6; border-radius: 30px 30px 0 0;
}

/* 2. 悬浮容器与高光收益卡 */
.floating-container { margin-top: -40px; padding: 0 16px; position: relative; z-index: 5; }

.earnings-premium-card {
  background: #fff; border-radius: 20px; padding: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px; text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
}

.earnings-premium-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 4px;
  background: linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%);
  opacity: 0.6;
}

.e-label { font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 700; text-transform: uppercase; }
.e-amount { color: #1a1a1a; display: flex; align-items: baseline; justify-content: center; gap: 4px; }
.e-amount .symbol { font-size: 20px; font-weight: 800; color: #ee0a24; }
.e-amount .number { font-size: 48px; font-weight: 900; font-family: 'DIN Alternate', sans-serif; color: #ee0a24; letter-spacing: -1px; }
.e-footer { margin-top: 12px; font-size: 11px; color: #94a3b8; display: flex; align-items: center; justify-content: center; gap: 4px; }

/* 考核评价卡片 */
.assessment-card {
  border: 1px solid #fff1f0;
  background: linear-gradient(to bottom, #fff, #fff9f9);
}
.assessment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.assessment-content {
  padding: 4px 0;
}
.rate-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.rate-text {
  font-size: 18px;
  font-weight: 900;
  color: #faad14;
  font-family: 'DIN Alternate';
}
.review-text {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.6;
  font-style: italic;
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 10px;
}
.review-meta {
  font-size: 11px;
  color: #94a3b8;
  text-align: right;
}
.pending-review-box {
  text-align: center;
  padding: 20px 0;
  color: #64748b;
}
.pending-review-box p {
  font-size: 14px;
  margin: 10px 0 4px;
  font-weight: 600;
}
.tips-sm {
  font-size: 12px;
  color: #94a3b8;
}

/* 3. 玻璃感客户卡 */
.patient-info-card {
  background: white;
  border: 1px solid #fff1f0;
}
.pic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.pic-title {
  font-size: 14px;
  font-weight: 900;
  color: #1e293b;
  text-transform: uppercase;
}
.pic-body {
  display: flex;
  align-items: center;
  gap: 16px;
}
.pic-avatar {
  width: 48px;
  height: 48px;
  background: #ff4d4f;
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
}
.pic-info { flex: 1; }
.pic-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.pic-name-row .name { font-size: 18px; font-weight: 800; color: #1e293b; }
.pic-name-row .male { color: #3b82f6; }
.pic-name-row .female { color: #f43f5e; }
.pic-name-row .age { font-size: 13px; color: #94a3b8; font-weight: 600; }
.pic-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.p-tag { font-weight: 700; border-radius: 4px; }
.pic-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #f1f5f9;
}
.pic-footer .f-label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
.pic-footer .f-val { font-size: 13px; color: #475569; line-height: 1.5; background: #fffcfc; padding: 8px; border-radius: 8px; }

.glass-card {
  background: white;
  border-radius: 20px; padding: 20px;
  margin-bottom: 16px; border: 1px solid #f1f5f9;
  box-shadow: 0 4px 20px rgba(0,0,0,0.02);
}
.c-info-box { display: flex; align-items: center; gap: 16px; }
.c-avatar { width: 52px; height: 52px; background: #f1f5f9; color: #1a1a1a; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
.c-text { flex: 1; }
.c-name { font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 2px; }
.c-phone { font-size: 13px; color: #94a3b8; font-weight: 500; }
.c-actions { display: flex; gap: 10px; }
.circle-btn { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s; }
.circle-btn.chat { background: #f8fafc; color: #1a1a1a; border: 1px solid #e2e8f0; }
.circle-btn.phone { background: #f8fafc; color: #1a1a1a; border: 1px solid #e2e8f0; }
.c-divider { height: 1px; background: #f1f5f9; margin: 16px 0; }
.c-address { display: flex; align-items: flex-start; gap: 12px; }
.addr-tag { font-size: 10px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; margin-top: 2px; font-weight: 700; }
.addr-main { flex: 1; display: flex; justify-content: space-between; align-items: center; }
.addr-text { font-size: 14px; font-weight: 700; color: #1e293b; line-height: 1.5; }
.loc-icon { font-size: 18px; color: #94a3b8; }

/* 4. 详情白卡 */
.detail-white-card { background: #fff; border-radius: 24px; padding: 24px; margin-bottom: 16px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
.dw-title { font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
.title-left { display: flex; align-items: center; gap: 8px; }
.title-icon { font-size: 18px; color: #64748b; }
.title-icon.medical { color: #ef4444; }
.title-icon.pet { color: #7c3aed; }
.title-icon.home { color: #10b981; }
.dw-item { display: flex; justify-content: space-between; margin-bottom: 18px; align-items: flex-start; }
.dw-label { font-size: 13px; color: #64748b; font-weight: 600; min-width: 80px; }
.dw-val { font-size: 14px; font-weight: 700; color: #1e293b; text-align: right; flex: 1; }
.dw-val.highlight { color: #7c3aed; background: #f5f3ff; padding: 4px 12px; border-radius: 8px; }

/* 宠物专项标签增强 */
.pet-tags-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #f1f5f9; }
.pts-label { font-size: 12px; color: #94a3b8; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; }
.pts-content { display: flex; flex-wrap: wrap; gap: 8px; }
.pts-tag { margin: 0 !important; font-weight: 700 !important; }
.pts-empty { font-size: 13px; color: #cbd5e1; font-style: italic; }

/* 订单额外信息行 */
.order-extra-info { margin-top: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; padding: 16px; border-radius: 16px; }
.ex-row { display: flex; justify-content: space-between; align-items: center; }
.ex-label { font-size: 12px; color: #64748b; font-weight: 600; }
.ex-val { font-size: 13px; color: #0f172a; font-weight: 800; }

/* 陪诊工具箱样式 */
.medical-action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 8px 0;
}

.m-tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.m-tool-btn span {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.m-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  transition: all 0.2s;
}

.m-icon-box.advice { background: #fff7ed; color: #f97316; }
.m-icon-box.bill { background: #f0fdf4; color: #16a34a; }
.m-icon-box.drug { background: #eff6ff; color: #3b82f6; }
.m-icon-box.share { background: #faf5ff; color: #a855f7; }

.m-tool-btn:active .m-icon-box {
  transform: scale(0.9);
  opacity: 0.8;
}

.m-dot {
  position: absolute;
  top: -2px;
  right: 15px;
}
.remark-item { flex-direction: column; gap: 8px; }
.remark-item .dw-val { color: #ee0a24; background: #fff5f5; padding: 10px; border-radius: 12px; width: 100%; box-sizing: border-box; }

/* 5. 履约时间轴 */
.timeline-track { margin-top: 10px; }
.time-node { display: flex; gap: 16px; padding-bottom: 20px; }
.node-left { display: flex; flex-direction: column; align-items: center; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #eee; z-index: 2; margin-top: 6px; }
.line { flex: 1; width: 2px; background: #f5f5f5; margin: 4px 0 -4px; }
.time-node:last-child .line { display: none; }
.time-node.active .dot { background: #11998e; box-shadow: 0 0 0 4px rgba(17, 153, 142, 0.1); }
.time-node.active .line { background: #11998e; opacity: 0.3; }
.node-right { flex: 1; display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 12px 16px; border-radius: 16px; }
.n-date { font-size: 14px; font-weight: 800; color: #333; }
.n-status { font-size: 11px; color: #999; }

/* 6. 底部操作按钮 (浮动灵动设计) */
.action-footer-floating { 
  position: fixed; bottom: 20px; left: 16px; right: 16px; 
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}
.footer-inner {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 12px;
  border-radius: 28px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.btn-primary-glow { 
  height: 52px; 
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; 
  color: #fff !important; 
  border: none !important; 
  font-weight: 800; 
  border-radius: 16px !important;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary-glow:active {
  transform: translateY(2px);
  box-shadow: 0 4px 10px rgba(17, 153, 142, 0.1);
}

.btn-danger-glow {
  height: 52px;
  background: #ff4d4f !important;
  color: #fff !important;
  border: none !important;
  font-weight: 800;
  border-radius: 16px !important;
  box-shadow: 0 8px 16px rgba(255, 77, 79, 0.2);
}

/* 极简质感对话框定制 */
:deep(.van-dialog) {
  border-radius: 24px !important;
  padding: 8px;
}

:deep(.van-dialog__header) {
  padding-top: 24px;
  font-weight: 900;
  color: #1a1a1a;
  font-size: 18px;
}

:deep(.van-dialog__message) {
  padding: 24px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.6;
}

:deep(.van-dialog__footer) {
  padding: 8px 16px 16px;
  gap: 12px;
}

:deep(.van-dialog__confirm), :deep(.van-dialog__cancel) {
  border-radius: 12px !important;
  height: 44px;
  font-weight: 700;
}

:deep(.van-dialog__confirm) {
  background: #11998e !important;
  color: #fff !important;
}

:deep(.van-dialog__cancel) {
  background: #f1f5f9 !important;
  color: #64748b !important;
}

:deep(.van-hairline--top::after), :deep(.van-hairline--left::after) {
  border: none !important;
}

.serving-actions-v2 {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-btn-circle {
  width: 52px;
  height: 52px;
  background: #f8fafc;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #1a1a1a;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.main-action-area {
  flex: 1;
}

/* 呼吸动画 */
.pulse-anim {
  animation: pulse-red 2s infinite;
}
@keyframes pulse-red {
  0% { transform: scale(1); box-shadow: 0 8px 16px rgba(238, 10, 36, 0.25); }
  50% { transform: scale(1.02); box-shadow: 0 8px 24px rgba(238, 10, 36, 0.4); }
  100% { transform: scale(1); box-shadow: 0 8px 16px rgba(238, 10, 36, 0.25); }
}

.bottom-safe-padding { height: calc(100px + env(safe-area-inset-bottom)); }

/* 报告弹窗极简质感版 */
.premium-complete-popup {
  padding: 24px 20px 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
}

.p-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.p-p-title {
  font-size: 22px;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}

.p-p-desc {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.p-header-close {
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 18px;
}

.p-report-section {
  margin-bottom: 32px;
}

.p-sec-label {
  font-size: 15px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.p-sec-label span {
  font-size: 12px;
  font-weight: normal;
  color: #ccc;
}

/* 照片上传槽样式 */
.p-upload-slot {
  width: 100px;
  height: 100px;
  background: #fcfcfc;
  border: 2px dashed #eee;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bbb;
  gap: 8px;
  transition: all 0.3s;
}

.p-upload-slot van-icon {
  font-size: 28px;
}

.p-upload-slot span {
  font-size: 12px;
}

/* 标签网格 */
.p-tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.p-pill-tag {
  padding: 10px 16px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.p-pill-tag.active {
  background: #eefaf8;
  border-color: #11998e;
  color: #11998e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.1);
}

.p-pill-tag.active van-icon {
  transform: scale(1.1);
}

/* 提交按钮容器 */
.p-submit-container {
  margin-top: 48px;
}

.p-btn-submit {
  height: 56px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  font-size: 16px;
  font-weight: 800;
  border-radius: 18px !important;
  box-shadow: 0 10px 25px rgba(17, 153, 142, 0.25);
}

.p-btn-submit:active {
  transform: scale(0.98);
  opacity: 0.9;
}

/* 喂猫专项样式 (ID 37) - 极简质感加固 */
.fuzzy-address { display: flex; flex-direction: column; gap: 2px; }
.privacy-tips { font-size: 11px; color: #94a3b8; font-weight: normal; }
.key-handover-tile { margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px dashed #e2e8f0; }
.kh-label { font-size: 12px; color: #64748b; font-weight: 700; }
.kh-val { font-size: 13px; color: #1e293b; font-weight: 800; }

.cat-steps { margin-top: 16px; display: flex; flex-direction: column; gap: 16px; }
.cat-step-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 16px; transition: all 0.3s; }
.cat-step-item.done { background: #f0fdf4; border: 1px solid #bcf0da; }
.cat-step-item.disabled { opacity: 0.4; pointer-events: none; }
.cs-circle { width: 24px; height: 24px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; color: #fff; }
.done .cs-circle { background: #11998e; }
.cs-info { flex: 1; }
.cs-name { font-size: 14px; font-weight: 800; color: #1e293b; }
.cs-desc { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.cat-env-floating { position: fixed; bottom: 100px; right: 16px; width: 80px; height: 80px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 800; box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 110; gap: 4px; border: 1px solid rgba(255,255,255,0.1); }
.cat-env-floating:active { transform: scale(0.9); }

.env-note-popup { width: 85%; background: transparent !important; }
.en-card { background: #fff; border-radius: 28px; padding: 28px; }
.en-title { font-size: 18px; font-weight: 900; color: #1a1a1a; margin-bottom: 24px; text-align: center; }
.en-section { margin-bottom: 20px; }
.en-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; }
.en-val { font-size: 14px; color: #1e293b; line-height: 1.6; font-weight: 500; background: #f8fafc; padding: 12px; border-radius: 12px; }
.en-row { display: flex; gap: 8px; flex-wrap: wrap; }
.en-tag { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.en-tag.warning { background: #fff7ed; color: #f97316; }
.en-tag.info { background: #f0fdfa; color: #11998e; }
.en-close-btn { margin-top: 12px; background: #0f172a !important; color: #fff !important; height: 50px !important; font-weight: 800; }

.assigned-banner {
  background: rgba(124, 58, 237, 0.9);
  color: #fff;
  padding: 10px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  backdrop-filter: blur(8px);
  animation: slide-down 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
 
@keyframes slide-down {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
