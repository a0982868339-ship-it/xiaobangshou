<template>
  <div class="order-detail-page">
    <van-nav-bar title="订单详情" left-arrow @click-left="$router.back()" fixed placeholder class="minimal-nav" />
    
    <!-- 1. 品牌感状态头部 (沉浸式动态背景) -->
    <div class="brand-hero" :class="heroClass">
      <div class="hero-content">
        <div class="status-row">
          <div class="status-main">
            <van-icon :name="getStatusIcon(order.status, order.pay_status, order.confirm_status)" class="status-icon-anim" />
            <span class="status-text">{{ getStatusText(order.status, order.pay_status, order.confirm_status) }}</span>
          </div>
          <div class="order-id">单号: {{ order.order_no?.slice(-8) }}</div>
        </div>
        <div class="status-desc" v-if="heroClass === 'hero-unpaid'">
          请在 <span class="countdown-text">{{ formatRemainingTime(payRemainingSeconds) }}</span> 内完成支付，逾期订单将自动取消
        </div>
        <div class="status-desc" v-else>{{ getStatusDesc(order.status, order.pay_status, order.confirm_status) }}</div>
      </div>
      <!-- 弧形底边装饰 -->
      <div class="hero-arc"></div>
    </div>

    <!-- 2. 核心服务内容 (悬浮层叠) -->
    <div class="floating-container">
      <!-- 陪诊专项：数字化档案 (Status 2, 3, 5) -->
      <template v-if="(order.service_name?.includes('陪诊') || order.category_name?.includes('陪诊')) && [2, 3, 5].includes(order.status)">
        <!-- 患者信息卡 -->
        <div class="glass-card patient-medical-card">
          <div class="pmc-header">
            <div class="pmc-avatar">{{ order.patient_name?.[0] || '患' }}</div>
            <div class="pmc-info">
              <div class="pmc-name">{{ order.patient_name || '就诊人' }}</div>
              <div class="pmc-meta">{{ order.patient_gender === 1 ? '男' : '女' }} · {{ order.patient_age || '?' }}岁</div>
            </div>
            <div class="pmc-hospital">
              <van-icon name="hospital-o" />
              <span>{{ order.hospital_name }}</span>
            </div>
          </div>
          <div class="pmc-tags" v-if="order.patient_tags && parseJSON(order.patient_tags)?.length > 0">
            <van-tag v-for="tag in parseJSON(order.patient_tags)" :key="tag" type="danger" plain round class="pmc-tag">
              {{ tag }}
            </van-tag>
          </div>
        </div>

        <!-- 服务执行档案 (仅在服务中或完成后展示) -->
        <div class="medical-live-dashboard shadow-card">
          <div class="mld-header">
            <div class="mld-title">
              <van-icon name="todo-list-o" color="#4f46e5" />
              <span>服务执行档案</span>
            </div>
            <div class="mld-timer" v-if="order.status === 2">
              履约中...
            </div>
            <div class="verified-badge" v-else>
              <van-icon name="passed" /> 履约完成
            </div>
          </div>
          
          <div class="mld-body">
            <!-- 1. 医生医嘱 -->
            <div class="mld-section" v-if="order.medical_advice_text || (order.medical_advice_images && parseJSON(order.medical_advice_images).length > 0)">
              <div class="mld-row">
                <div class="mr-icon advice"><van-icon name="notes-o" /></div>
                <div class="mr-content">
                  <div class="mr-label">就诊医嘱记录</div>
                  <div class="mr-val" v-if="order.medical_advice_text">{{ order.medical_advice_text }}</div>
                  <div class="mr-val placeholder" v-else>师傅尚未录入医嘱</div>
                </div>
              </div>
              <div class="mld-sub-grid" v-if="order.medical_advice_images && parseJSON(order.medical_advice_images).length > 0">
                <van-image 
                  v-for="(img, idx) in parseJSON(order.medical_advice_images)" 
                  :key="idx" :src="img" fit="cover" radius="8"
                  @click="showImagePreview(parseJSON(order.medical_advice_images), idx)"
                />
              </div>
            </div>

            <!-- 2. 费用账单 (陪诊特供) -->
            <div class="mld-section" v-if="order.bill_images && parseJSON(order.bill_images).length > 0">
              <div class="mld-row">
                <div class="mr-icon bill"><van-icon name="bill-o" /></div>
                <div class="mr-content">
                  <div class="mr-label">费用及票据凭证</div>
                  <div class="mr-val">已回传 {{ parseJSON(order.bill_images).length }} 张票据凭证</div>
                </div>
              </div>
              <div class="mld-sub-grid">
                <van-image 
                  v-for="(img, idx) in parseJSON(order.bill_images)" 
                  :key="idx" :src="img" fit="cover" radius="8"
                  @click="showImagePreview(parseJSON(order.bill_images), idx)"
                />
              </div>
            </div>

            <!-- 3. 用药提醒 -->
            <div class="mld-section" v-if="order.medication_reminder_text || (order.medication_reminder_images && parseJSON(order.medication_reminder_images).length > 0)">
              <div class="mld-row">
                <div class="mr-icon drug"><van-icon name="clock-o" /></div>
                <div class="mr-content">
                  <div class="mr-label">用药嘱托</div>
                  <div class="mr-val">{{ order.medication_reminder_text || '见下方图片说明' }}</div>
                </div>
              </div>
              <div class="mld-sub-grid" v-if="order.medication_reminder_images && parseJSON(order.medication_reminder_images).length > 0">
                <van-image 
                  v-for="(img, idx) in parseJSON(order.medication_reminder_images)" 
                  :key="idx" :src="img" fit="cover" radius="8"
                  @click="showImagePreview(parseJSON(order.medication_reminder_images), idx)"
                />
              </div>
            </div>

            <!-- 4. 服务项目完成确认 (仅显示勾选的标签) -->
            <div class="mld-section" v-if="(order.completion_tags && parseJSON(order.completion_tags).length > 0) || (order.proof_images && parseJSON(order.proof_images).length > 0)">
              <div class="mld-row">
                <div class="mr-icon check"><van-icon name="passed" /></div>
                <div class="mr-content">
                  <div class="mr-label">服务达成确认</div>
                  <div class="mld-tags" v-if="order.completion_tags && parseJSON(order.completion_tags).length > 0">
                    <van-tag v-for="tag in parseJSON(order.completion_tags)" :key="tag" color="#eefaf5" text-color="#07c160" plain>{{ tag }}</van-tag>
                  </div>
                </div>
              </div>
              <div class="mld-sub-grid" v-if="order.proof_images && parseJSON(order.proof_images).length > 0">
                <van-image 
                  v-for="(img, idx) in parseJSON(order.proof_images)" 
                  :key="idx" :src="img" fit="cover" radius="8"
                  @click="showImagePreview(parseJSON(order.proof_images), idx)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- [阶段 A: 执行期/结算期] 常规服务成果 (遛狗、做饭等) -->
      <ResultDashboard 
        v-if="[2, 3, 5, 11, 12].includes(order.status) && !(order.service_name?.includes('陪诊') || order.category_name?.includes('陪诊'))"
        :order="order" 
        :walking-duration="walkingDuration"
        @expand-map="expandMap"
      />

      <!-- 服务者名片 (已接单后可见) -->
      <div class="glass-card provider-glass" v-if="order.provider_user_id">
        <div class="p-info-box">
          <div class="p-avatar-wrap" @click="openProviderInfo">
            <van-image :src="order.provider_avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/ipad.jpeg'" round width="56" height="56" />
            <div class="p-tag-badge"><van-icon name="medal" /></div>
          </div>
          <div class="p-text" @click="openProviderInfo">
            <div class="p-name">{{ order.provider_nickname || '专业服务者' }}</div>
            <div class="p-rating">
              <van-rate :model-value="Number(order.provider_rating || 5)" readonly size="12" color="#ffd21e" />
              <span class="p-score">{{ Number(order.provider_rating || 5).toFixed(1) }}</span>
            </div>
          </div>
          <div class="p-actions" v-if="order.status >= 1 && order.status <= 2">
            <div class="circle-btn chat" @click="goToChat"><van-icon name="chat" /></div>
            <div class="circle-btn phone" @click="handlePrivacyCall"><van-icon name="phone" /></div>
          </div>
        </div>
      </div>

      <!-- 周期单排期轨迹 (母子模型/旧版排期模型通用) -->
      <div class="detail-white-card" v-if="order.order_type === 1 || order.parent_recurring_id">
        <div class="dw-title">服务执行进度 ({{ order.completed_count || 0 }}/{{ order.total_count || order.total_sessions || 0 }})</div>
        <div class="timeline-track">
          <div v-for="item in order.schedules" :key="item.id" class="time-node" :class="{ 'active': item.status === 1 || item.status === 3 }" @click="goToSessionDetail(item)">
            <div class="node-left">
              <div class="dot"></div>
              <div class="line"></div>
            </div>
            <div class="node-right">
              <div class="node-info">
                <div class="n-date">{{ formatDateShort(item.service_date) }} {{ item.service_time }}</div>
                <div class="n-status">
                  <span v-if="item.status === 1 || item.status === 3">服务完成</span>
                  <span v-else-if="item.status === 2">服务中</span>
                  <span v-else-if="item.status === 11">师傅已到</span>
                  <span v-else-if="item.status === 4">已取消</span>
                  <span v-else>等待服务</span>
                </div>
              </div>
              <div class="n-actions">
                <van-button v-if="item.status === 1 || item.status === 3" size="mini" round plain type="primary" class="n-btn" @click.stop="goToSessionDetail(item)">查看成果</van-button>
                <!-- 精确取消入口：仅对未开始且是新主表模型的子项开放 -->
                <van-button v-if="item.status === 1 && item.is_new_model && order.status !== 4" size="mini" round plain type="danger" class="n-btn" @click.stop="handleSessionCancel(item)">申请取消</van-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 服务进度时间轴 -->
      <div class="detail-white-card">
        <div class="dw-title">服务全节点溯源</div>
        <div class="node-steps">
          <div class="node-step" :class="{ 'active': order.status >= 0 }">
            <div class="ns-dot"></div>
            <div class="ns-content">
              <div class="ns-title">订单已提交</div>
              <div class="ns-time">{{ formatDate(order.created_at) }}</div>
            </div>
          </div>
          <!-- 支付节点 -->
          <div class="node-step" v-if="order.pay_status === 1" :class="{ 'active': order.pay_status === 1 }">
            <div class="ns-dot"></div>
            <div class="ns-content">
              <div class="ns-title">订单已付款</div>
              <div class="ns-time">{{ formatDate(order.pay_time) }}</div>
            </div>
          </div>
          <div class="node-step" v-if="order.accepted_at" :class="{ 'active': order.status >= 1 }">
            <div class="ns-dot"></div>
            <div class="ns-content">
              <div class="ns-title">师傅已接单</div>
              <div class="ns-time">{{ formatDate(order.accepted_at) }}</div>
            </div>
          </div>
          <div class="node-step" v-if="order.arrived_at" :class="{ 'active': order.is_arrived === 1 }">
            <div class="ns-dot"></div>
            <div class="ns-content">
              <div class="ns-title">师傅已到达</div>
              <div class="ns-time">{{ formatDate(order.arrived_at) }}</div>
            </div>
          </div>
          <div class="node-step" v-if="order.started_at" :class="{ 'active': order.status >= 2 }">
            <div class="ns-dot"></div>
            <div class="ns-content">
              <div class="ns-title">服务已开始</div>
              <div class="ns-time">{{ formatDate(order.started_at) }}</div>
            </div>
          </div>
          <div class="node-step" v-if="order.complete_time" :class="{ 'active': order.status >= 3 }">
            <div class="ns-dot"></div>
            <div class="ns-content">
              <div class="ns-title">服务圆满结束</div>
              <div class="ns-time">{{ formatDate(order.complete_time) }}</div>
            </div>
          </div>
          <!-- 取消节点 -->
          <div class="node-step" v-if="order.status === 4" :class="{ 'active': true }">
            <div class="ns-dot" style="background: #94a3b8;"></div>
            <div class="ns-content">
              <div class="ns-title" style="color: #94a3b8;">订单已取消</div>
              <div class="ns-time">{{ formatDate(order.updated_at) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 服务详情单 -->
      <div class="detail-white-card">
        <div class="dw-title">订单详情单</div>
        <div class="dw-item">
          <div class="dw-label">服务项目</div>
          <div class="dw-val">{{ order.service_name }}</div>
        </div>
        <div class="dw-item">
          <div class="dw-label">预约时间</div>
          <div class="dw-val highlight">{{ formatDate(order.service_time) }}</div>
        </div>
        
        <!-- 陪诊专项详情 -->
        <template v-if="order.category_name?.includes('陪诊')">
          <div class="dw-item">
            <div class="dw-label">就诊医院</div>
            <div class="dw-val">{{ order.hospital_name }}</div>
          </div>
          <div class="dw-item">
            <div class="dw-label">就诊人</div>
            <div class="dw-val">{{ order.patient_name }} ({{ order.patient_gender === 1 ? '男' : '女' }} · {{ order.patient_age }}岁)</div>
          </div>
          <div class="dw-item" v-if="order.patient_tags && parseJSON(order.patient_tags).length > 0">
            <div class="dw-label">健康标签</div>
            <div class="dish-tags">
              <van-tag v-for="tag in parseJSON(order.patient_tags)" :key="tag" plain type="danger">
                {{ tag }}
              </van-tag>
            </div>
          </div>
        </template>

        <template v-if="isNursingVisit">
          <div class="dw-item">
            <div class="dw-label">养老院名称</div>
            <div class="dw-val">{{ nursingOptions.nursingHomeName || '未填写' }}</div>
          </div>
          <div class="dw-item">
            <div class="dw-label">老人信息</div>
            <div class="dw-val">{{ nursingOptions.elderName || '未填写' }}{{ nursingOptions.elderAge ? ` · ${nursingOptions.elderAge}岁` : '' }}{{ nursingOptions.elderGender ? ` · ${nursingOptions.elderGender}` : '' }}</div>
          </div>
          <div class="dw-item" v-if="nursingOptions.relation">
            <div class="dw-label">与老人关系</div>
            <div class="dw-val">{{ nursingOptions.relation }}</div>
          </div>
          <div class="dw-item" v-if="nursingOptions.visitPackage">
            <div class="dw-label">探访时长</div>
            <div class="dw-val">{{ nursingOptions.visitPackage }}</div>
          </div>
          <div class="dw-item" v-if="nursingOptions.visitFocus && nursingOptions.visitFocus.length">
            <div class="dw-label">探访重点</div>
            <div class="dw-val">{{ nursingOptions.visitFocus.join('、') }}</div>
          </div>
          <div class="dw-item" v-if="nursingOptions.needPhotoReport || nursingOptions.needVideoReport">
            <div class="dw-label">输出方式</div>
            <div class="dw-val">{{ [nursingOptions.needPhotoReport ? '图文记录' : '', nursingOptions.needVideoReport ? '短视频' : ''].filter(Boolean).join(' · ') }}</div>
          </div>
        </template>

        <!-- 常规地址 -->
        <template v-else>
          <div class="dw-item" v-if="order.hospital_name">
            <div class="dw-label">就诊医院</div>
            <div class="dw-val">{{ order.hospital_name }}</div>
          </div>
          <div class="dw-item">
            <div class="dw-label">服务地址</div>
            <div class="dw-val">{{ order.service_address }}</div>
          </div>
        </template>

        <div class="dw-item">
          <div class="dw-label">联系人</div>
          <div class="dw-val">{{ order.contact_name }} ({{ hidePhone(order.contact_phone) }})</div>
        </div>
        <div class="dw-item dish-item" v-if="order.dish_details">
          <div class="dw-label">点菜明细</div>
          <div class="dish-tags">
            <van-tag v-for="(count, type) in parseJSON(order.dish_details)" :key="type" v-show="count > 0" plain type="primary">
              {{ dishMap[type] }} x{{ count }}
            </van-tag>
          </div>
        </div>
      </div>

      <!-- 费用明细 -->
      <div class="detail-white-card fee-card">
        <div class="dw-title">费用结算单</div>
        <div class="dw-item">
          <div class="dw-label">服务费</div>
          <div class="dw-val">¥{{ (Number(order.total_price || 0) - Number(order.shopping_fee || 0) - Number(order.deposit_amount || 0)).toFixed(2) }}</div>
        </div>
        <div class="dw-item" v-if="order.shopping_fee > 0">
          <div class="dw-label">代买辛苦费</div>
          <div class="dw-val">¥{{ order.shopping_fee }}</div>
        </div>
        <div class="dw-item" v-if="order.deposit_amount > 0">
          <div class="dw-label">买菜押金 (报销后退回)</div>
          <div class="dw-val">¥{{ order.deposit_amount }}</div>
        </div>
        <div class="dw-divider"></div>
        <div class="dw-item total-row">
          <div class="dw-label">实付总额</div>
          <div class="dw-val price-text">¥{{ order.total_price }}</div>
        </div>
      </div>
      <div class="bottom-padding-gap"></div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="action-footer" v-if="order.status <= 3 || order.status === 10">
      <!-- 情况 A：待支付状态 -->
      <div v-if="(order.status === 10 || order.status === 0) && order.pay_status === 0" class="serving-actions">
        <van-button block round class="btn-secondary" @click="handleCancel">取消订单</van-button>
        <van-button block round class="btn-primary" @click="handlePay" :disabled="isOrderTooClose">
          {{ isOrderTooClose ? '已临期不可支付' : '立即支付' }}
        </van-button>
      </div>
      
      <!-- 情况 B：已支付，待接单 -->
      <div v-else-if="order.status === 0 && order.pay_status === 1" class="serving-actions">
        <!-- 优化逻辑：如果周期单已经有场次开始/完成了，不再允许全局全额取消，应引导用户去单挑取消 -->
        <van-button v-if="!(order.order_type === 1 && order.completed_count > 0)" block round class="btn-secondary" @click="handleCancel">取消订单</van-button>
        <van-button v-else block round class="btn-secondary" disabled>部分已完成</van-button>
        <van-button block round class="btn-primary" @click="handleExpedite" :loading="expediteLoading">优先调度</van-button>
      </div>
      
      <!-- 情况 C：服务中 (含协商取消逻辑) -->
      <div v-else-if="order.status === 1 || order.status === 2 || order.status === 11 || order.status === 12" class="serving-actions">
        <van-button block round class="btn-secondary" @click="goToChat">联系师傅</van-button>
        <van-button v-if="order.status === 12" block round class="btn-primary" disabled>取消协商中...</van-button>
        <!-- 优化逻辑：服务进行中的周期单，不该直接申请全局取消，隐藏它 -->
        <van-button v-else-if="order.order_type !== 1" block round class="btn-primary" @click="handleRequestCancel">申请取消</van-button>
        <van-button v-else block round class="btn-primary" disabled>进行中周期单</van-button>
      </div>
      
      <!-- 情况 D：服务完成待确认 或 待评价 -->
      <div v-else-if="order.status === 3" class="serving-actions">
        <van-button block round class="btn-secondary" @click="goToChat">联系师傅</van-button>
        <van-button v-if="order.confirm_status === 0" block round class="btn-primary" @click="handleUserConfirm">确认满意</van-button>
        <van-button v-else block round class="btn-primary" @click="goReview">去评价</van-button>
      </div>
    </div>

    <!-- 服务者专业档案弹窗 (重构质感版) -->
    <van-popup v-model:show="showProviderInfo" round position="bottom" class="provider-info-popup">
      <div class="provider-pro-panel" v-if="providerDetail">
        <div class="pro-panel-header">
          <div class="pro-avatar-row">
            <van-image :src="order.provider_avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/ipad.jpeg'" round width="72" height="72" class="pro-avatar" />
            <div class="pro-main-info">
              <div class="pro-name-line">
                <span class="pro-name">{{ providerDetail.name || order.provider_nickname }}</span>
                <van-tag type="success" size="small" plain round v-if="providerDetail.verify_status === 1">
                  <van-icon name="shield-o" /> 已实名
                </van-tag>
              </div>
              <div class="pro-rating-line">
                <van-rate :model-value="Number(providerDetail.rating || 5)" readonly allow-half size="14" color="#ffd21e" />
                <span class="pro-score">{{ Number(providerDetail.rating || 5).toFixed(1) }}</span>
              </div>
            </div>
          </div>
          <div class="pro-badge-row">
            <div class="pro-badge medical" v-if="providerDetail.health_cert_status === 1">
              <van-icon name="passed" />
              <span>健康证已验</span>
            </div>
            <div class="pro-badge safety">
              <van-icon name="shield-o" />
              <span>百万服务险</span>
            </div>
          </div>
        </div>

        <div class="pro-stats-card">
          <div class="pro-stat-item">
            <div class="ps-val">{{ providerDetail.completedCount || 0 }}</div>
            <div class="ps-label">服务单数</div>
          </div>
          <div class="ps-sep"></div>
          <div class="pro-stat-item">
            <div class="ps-val">{{ providerDetail.experienceYears || 1 }}</div>
            <div class="ps-label">从业年限</div>
          </div>
          <div class="ps-sep"></div>
          <div class="pro-stat-item">
            <div class="ps-val">100%</div>
            <div class="ps-label">好评率</div>
          </div>
        </div>

        <div class="pro-content">
          <div class="pro-section">
            <div class="pro-sec-title">专业资质</div>
            <div class="pro-cert-grid">
              <div class="pro-cert-box active">
                <van-icon name="idcard" />
                <span>实名认证</span>
              </div>
              <div class="pro-cert-box" :class="{ 'active': providerDetail.health_cert_status === 1 }">
                <van-icon name="records-o" />
                <span>健康证明</span>
              </div>
              <div class="pro-cert-box active">
                <van-icon name="award-o" />
                <span>平台培训</span>
              </div>
              <div class="pro-cert-box active">
                <van-icon name="shield-o" />
                <span>无忧险</span>
              </div>
            </div>
          </div>

          <div class="pro-section">
            <div class="pro-sec-title">客户印象</div>
            <div class="pro-tags-wrap">
              <div v-for="tag in providerDetail.tags?.slice(0, 5)" :key="tag.label" class="pro-didi-tag">
                {{ tag.label }} {{ tag.count }}
              </div>
            </div>
          </div>
        </div>

        <div class="pro-action-footer">
          <van-button block round type="primary" class="pro-btn-contact" @click="goToChat">立即沟通</van-button>
        </div>
      </div>
    </van-popup>
    
    <div class="safe-area-inset"></div>

    <!-- 评价弹窗 -->
    <van-popup v-model:show="showReviewPopup" round position="bottom" class="review-premium-popup">
      <div class="review-container">
        <div class="review-header">
          <div class="r-title">发表评价</div>
          <van-icon name="cross" @click="showReviewPopup = false" />
        </div>
        <div class="review-content">
          <div class="rate-box">
            <div class="r-label">整体满意度</div>
            <van-rate v-model="reviewForm.rating" size="28" color="#ffd21e" void-icon="star" void-color="#eee" />
          </div>
          <van-field
            v-model="reviewForm.content"
            rows="4"
            autosize
            type="textarea"
            maxlength="200"
            placeholder="师傅的服务如何？环境清理到位吗？分享您的真实感受..."
            show-word-limit
            class="review-input"
          />
          <div class="submit-action">
            <van-button type="primary" block round class="btn-submit" @click="submitReview" :loading="submitting">提交评价</van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, h, render, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrderDetail, cancelOrder, confirmOrder, disputeOrder, payOrder } from '../api'
import request from '../api'
import { useSocket } from '../composables/useSocket'
import NotificationCard from '../components/NotificationCard.vue'
import { showToast, showConfirmDialog, showImagePreview, showSuccessToast, showLoadingToast } from 'vant'
import { loadAMap } from '../utils/amap'
import ResultDashboard from '../components/ResultDashboard.vue'

const route = useRoute()
const router = useRouter()
const order = ref({})
const payRemainingSeconds = ref(0)
let payTimer = null
const expediteLoading = ref(false)

const parseOptions = (value) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return {}
  }
}

const isNursingVisit = computed(() => {
  const name = order.value.service_name || ''
  const category = order.value.category_name || ''
  return name.includes('养老院') || name.includes('探访') || category.includes('养老') || category.includes('陪护') || category.includes('陪伴')
})

const nursingOptions = computed(() => parseOptions(order.value.service_options))

const heroClass = computed(() => {
  const s = order.value.status;
  const p = order.value.pay_status;
  const c = order.value.confirm_status;
  
  if (s === 10 || (s === 0 && p === 0)) return 'hero-unpaid';
  if (s === 0 && p === 1) return 'hero-pending';
  if (s === 1) return 'hero-accepted';
  if (s === 11) return 'hero-accepted'; // 已到达沿用已接单色系
  if (s === 12) return 'hero-unpaid';   // 协商中沿用冷静灰色系
  if (s === 2) return 'hero-serving';
  if (s === 3 && c === 0) return 'hero-completed';
  if (s === 3 && c === 1) return 'hero-toreview';
  if (s === 5) return 'hero-finished';
  if (s === 4) return 'hero-cancelled';
  return 'hero-default';
});

const servingSeconds = ref(0)
let servingTimer = null
let liveTimer = null
let pollingTimer = null // 全局轮询兜底

const walkingDuration = ref(0)
let walkingTimer = null

const servingTimeDisplay = computed(() => {
  const h = Math.floor(servingSeconds.value / 3600)
  const m = Math.floor((servingSeconds.value % 3600) / 60)
  const s = servingSeconds.value % 60
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const startServingTimer = () => {
  if (order.value.started_at) {
    // 核心校准：使用服务端返回的 current_total_duration
    servingSeconds.value = Number(order.value.current_total_duration || 0);
    
    if (!servingTimer) {
      servingTimer = setInterval(() => {
        servingSeconds.value++
      }, 1000)
    }
  }
}

const startWalkingTimer = () => {
  if (order.value.is_walking === 1) {
    walkingDuration.value = Number(order.value.current_walking_duration || 0)
    if (!walkingTimer) {
      walkingTimer = setInterval(() => {
        walkingDuration.value++
      }, 1000)
    }
  }
}

const showFullAdvice = () => {
  showConfirmDialog({
    title: '完整医嘱内容',
    message: order.value.medical_advice_text,
    confirmButtonText: '关闭',
    showCancelButton: false
  })
}

const previewBills = () => {
  const imgs = parseJSON(order.value.bill_images)
  if (imgs && imgs.length > 0) {
    showImagePreview(imgs)
  }
}

const handleExpedite = () => {
  expediteLoading.value = true
  setTimeout(() => {
    showToast('已为您优先调度，请耐心等待师傅接单')
    expediteLoading.value = false
  }, 800)
}

const isOrderTooClose = computed(() => {
  if (!order.value.service_time) return false
  const serviceTime = new Date(order.value.service_time)
  const now = new Date()
  const diffInMinutes = (serviceTime - now) / (1000 * 60)
  return diffInMinutes < 60 // 距离服务不到 60 分钟
})

const startPayTimer = () => {
  if (payTimer) clearInterval(payTimer)
  payRemainingSeconds.value = order.value.pay_remaining_seconds || 0
  if (payRemainingSeconds.value <= 0) return
  
  payTimer = setInterval(() => {
    if (payRemainingSeconds.value > 0) {
      payRemainingSeconds.value--
    } else {
      clearInterval(payTimer)
      loadData() // 时间到，刷新状态
    }
  }, 1000)
}

const formatRemainingTime = (seconds) => {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
const dishMap = { main: '主菜', side: '副菜', veg: '素菜', soup: '汤类' }
const showProviderInfo = ref(false)
const providerDetail = ref(null)

// 评价相关
const showReviewPopup = ref(false)
const submitting = ref(false)
const reviewForm = ref({ rating: 5, content: '' })

const goReview = () => {
  showReviewPopup.value = true
}

const submitReview = async () => {
  if (!reviewForm.value.content) return showToast('请输入评价内容')
  submitting.value = true
  try {
    await request.post(`/orders/${order.value.id}/review`, reviewForm.value)
    showToast('评价成功')
    showReviewPopup.value = false
    loadData()
  } catch (e) {}
  submitting.value = false
}

// 核心录入相关函数转移到 autoSyncRecords 处理

const openProviderInfo = async () => {
  if (!order.value.provider_user_id) return
  showProviderInfo.value = true
  if (!providerDetail.value) {
    try {
      const res = await request.get(`/providers/${order.value.provider_user_id}`)
      providerDetail.value = res.data || res
    } catch (e) { showToast('获取详情失败') }
  }
}

const handleUserConfirm = () => {
  showConfirmDialog({ title: '确认满意', message: '确认后资金将立即打入师傅账户。' }).then(async () => {
    try { await confirmOrder(order.value.id); showToast('操作成功'); loadData() } catch (e) {}
  })
}

const handlePay = async () => {
  try {
    showLoadingToast({ message: '支付中...', forbidClick: true })
    await payOrder(order.value.id)
    showToast('支付成功')
    loadData()
  } catch (e) {
    console.error('支付失败:', e)
    const errorMsg = e.response?.data?.message || e.message || '支付失败'
    showConfirmDialog({
      title: '支付失败',
      message: errorMsg,
      confirmButtonText: '我知道了',
      showCancelButton: false
    }).then(() => {
      if (errorMsg.includes('预约时间过近')) {
        loadData()
      }
    })
  }
}

const handlePrivacyCall = () => {
  if (!order.value.provider_phone) return showToast('无法获取服务者虚拟号')
  showConfirmDialog({ title: '虚拟号通话', message: '正在为您呼叫服务者隐私虚拟号，通话将被录音。', confirmButtonText: '立即呼叫', confirmButtonColor: '#11998e' }).then(() => {
    window.location.href = `tel:${order.value.provider_phone}`
  })
}

const goToChat = () => {
  if (!order.value.provider_user_id) return showToast('暂无服务者信息')
  router.push({ path: '/chat', query: { targetId: order.value.provider_user_id, targetName: order.value.provider_nickname || '服务者', orderId: order.value.id } })
}

const loadData = async (silent = false) => {
  try {
    const res = await getOrderDetail(route.params.id)
    
    // 核心分流逻辑：如果是周期单母单，自动跳转到周期单详情页
    // 安全加固：仅对没有父单ID的母单进行分流，避免误伤属于周期单子项的普通单
    if (res && res.order_type === 1 && !res.parent_recurring_id) {
      return router.replace({ name: 'RecurringOrderDetail', params: { id: route.params.id } })
    }
    
    order.value = res
    
    // 启动服务计时器
    if (order.value.status === 2) {
      // 核心校准：使用服务端返回的 current_total_duration
      servingSeconds.value = Number(order.value.current_total_duration || 0);
      startServingTimer()
      
      // 遛狗专项：同步遛狗时长
      if (order.value.service_name?.includes('遛狗') || order.value.service_id === 36) {
        walkingDuration.value = Number(order.value.current_walking_duration || 0);
        if (order.value.is_walking === 1) {
          startWalkingTimer()
        } else if (walkingTimer) {
          clearInterval(walkingTimer)
          walkingTimer = null
        }
      }
    } else if (servingTimer) {
      clearInterval(servingTimer)
      servingTimer = null
    }

    // [新增] 全局状态轮询兜底 (Socket 失效时的双重保险)
    // 只要订单未结束 (状态不是 3-完成, 4-取消, 5-评价)，就开启 3秒 轮询
    const isFinalStatus = [3, 4, 5].includes(order.value.status);
    if (!isFinalStatus && !pollingTimer) {
      console.log('>> [Polling] 启动订单状态轮询兜底');
      pollingTimer = setInterval(() => loadData(true), 3000);
    } else if (isFinalStatus && pollingTimer) {
      console.log('>> [Polling] 订单已结束，停止轮询');
      clearInterval(pollingTimer);
      pollingTimer = null;
    }

    // 轮询校准：如果是服务中，开启定时刷新
    if (order.value.status === 2 && !liveTimer) {
      liveTimer = setInterval(async () => {
        const res = await getOrderDetail(route.params.id)
        if (res) {
          order.value = res
          servingSeconds.value = Number(order.value.current_total_duration || 0)
          walkingDuration.value = Number(order.value.current_walking_duration || 0)
        }
      }, 15000)
    } else if (order.value.status !== 2 && liveTimer) {
      clearInterval(liveTimer)
      liveTimer = null
    }

    if ((order.value.pay_status === 0 && order.value.status === 0) || order.value.status === 10) {
      startPayTimer()
      // 如果路由参数带 pay=1，自动弹出支付
      if (route.query.pay === '1') {
        nextTick(() => handlePay())
      }
    }

    // 评价联跳逻辑：如果参数带 review=1 且状态正确，自动弹出评价
    if (order.value.status === 3 && order.value.confirm_status === 1) {
      if (route.query.review === '1') {
        nextTick(() => goReview())
      }
    }
  } catch (e) {
    if (!silent) {
      console.error('加载详情失败:', e)
      showToast('加载失败')
    }
  }
}

const getStatusText = (s, p, c) => {
  if (s === 10 || (s === 0 && p === 0)) return '待支付'
  if (s === 3 && c === 1) return '待评价'
  if (s === 11) return '师傅已到达'
  if (s === 12) return '取消协商中'
  return ['待接单', '已接单', '服务中', '已完成', '已取消', '已评价'][s] || '未知'
}
const getStatusIcon = (s, p, c) => {
  if (s === 10 || (s === 0 && p === 0)) return 'clock-o'
  if (s === 3 && c === 1) return 'comment-o'
  if (s === 11) return 'location-o'
  if (s === 12) return 'question-o'
  const map = { 0: 'logistics', 1: 'logistics', 2: 'play-circle-o', 3: 'passed', 4: 'close', 5: 'passed' }
  return map[s] || 'question-o'
}
const getStatusDesc = (s, p, c) => {
  if (s === 10 || (s === 0 && p === 0)) return '订单已锁定，请尽快完成支付'
  if (s === 3 && c === 1) return '服务已确认，快去评价本次服务吧'
  if (s === 11) return '师傅已到达预约地点，准备开始服务'
  if (s === 12) return '您的取消申请已提交，请等待师傅确认'
  const map = { 0: '正在为您呼叫附近师傅，请耐心等待', 1: '服务者已接单，正准备出发', 2: '服务者正在为您提供专业服务', 3: '服务已圆满完成，期待您的确认', 4: '订单已取消', 5: '服务已完成，祝您生活愉快' }
  return map[s] || ''
}
const hidePhone = (phone) => phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''
const expandMap = () => showToast('正在为您放大地图视图...')
const formatDate = (date) => date ? new Date(date).toLocaleString() : ''
const formatDateShort = (date) => date ? `${new Date(date).getMonth() + 1}月${new Date(date).getDate()}日` : ''
const parseJSON = (str) => {
  if (!str || str === 'null') return []
  try {
    const res = typeof str === 'string' ? JSON.parse(str) : str
    return Array.isArray(res) ? res : []
  } catch (e) {
    return []
  }
}
const handleCancel = () => {
  showConfirmDialog({ title: '确认取消', message: '确定要取消这个订单吗？' }).then(async () => {
    try { await cancelOrder(order.value.id); showToast('取消成功'); loadData() } catch (e) {}
  })
}

const handleRequestCancel = () => {
  showConfirmDialog({ 
    title: '发起取消申请', 
    message: '师傅已接单，取消需经师傅同意。是否发起取消申请？',
    confirmButtonText: '发起申请',
    confirmButtonColor: '#ee0a24'
  }).then(async () => {
    try {
      await request.put(`/orders/${order.value.id}/request-cancel`)
      showToast('申请已提交，请等待师傅确认')
      loadData()
    } catch (e) {
      showToast(e.response?.data?.message || '提交失败')
    }
  })
}

// 跳转到子场次详情页
const goToSessionDetail = (item) => {
  // 如果点击的就是当前查看的单子，则不需要跳转
  if (String(item.id) === String(route.params.id)) return
  
  // 统一跳转到普通订单详情页，由详情页内部处理数据拉取
  router.push({ 
    path: `/order/${item.id}`
  }).then(() => {
    window.scrollTo(0, 0)
    loadData()
  })
}

// 模拟 handleSessionCancel (单次取消)
const handleSessionCancel = (session) => {
  showConfirmDialog({
    title: '取消单次服务',
    message: `确认取消 ${formatDateShort(session.service_date)} 的服务？取消需师傅同意，同意后资金将退回。`
  }).then(async () => {
    try {
      await request.post(`/recurring/session/${session.id}/request-cancel`)
      showToast('已提交单次取消申请')
      loadData()
    } catch (e) {
      showToast(e.message || '申请失败')
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

onMounted(() => {
  loadData()
  
  // 核心：监听 WebSocket 触发的全局刷新事件 (含 ID 路由校验)
  window.addEventListener('order-refresh', (e) => {
    if (e.detail && (e.detail.isReconnect || String(e.detail.orderId) === String(route.params.id))) {
      console.log(`>> [Socket/Detail] 匹配到当前订单或重连同步，执行刷新: ${route.params.id}`);
      loadData();
    }
  })

  // 监听订单状态变更事件 (Socket 驱动自动切页)
  window.addEventListener('ORDER_STATUS_CHANGE', (e) => {
    if (e.detail && String(e.detail.orderId) === String(route.params.id)) {
      console.log(`>> [Socket/Status] 状态变更，自动刷新页面: ${route.params.id}`);
      loadData();
    }
  })

  // 新增：直接 Socket 监听 (仅刷新数据，通知由 App.vue 处理)
  socket.on('order_status_update', (data) => {
    if (String(data.orderId) === String(route.params.id)) {
      console.log('>> [Socket] Real-time Order Update - Refreshing Detail:', data)
      loadData()
    }
  })
})

onUnmounted(() => { 
  if (liveTimer) clearInterval(liveTimer); 
  if (servingTimer) clearInterval(servingTimer);
  if (walkingTimer) clearInterval(walkingTimer);
  if (payTimer) clearInterval(payTimer);
  if (pollingTimer) clearInterval(pollingTimer); // 清理轮询定时器
  window.removeEventListener('order-refresh', loadData)
  window.removeEventListener('ORDER_STATUS_CHANGE', loadData)
  
  // 清理Socket监听
  socket.off('order_status_update')
})
</script>

<style scoped>
.order-detail-page { min-height: 100vh; background: #f8fafc; padding-bottom: 180px; }

/* 1. 品牌感头部渐变升级 - 状态化色彩 */
.brand-hero { padding: 60px 24px 100px; color: white; position: relative; transition: background 0.5s ease; }

/* 待支付：深空灰渐变 (中性冷静) */
.hero-unpaid { background: linear-gradient(135deg, #636e72 0%, #2d3436 100%); }

/* 待接单：商务蓝渐变 (期待感) */
.hero-pending { background: linear-gradient(135deg, #0984e3 0%, #74b9ff 100%); }

/* 已接单：蓝紫色渐变 (已确认感) */
.hero-accepted { background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%); }

/* 执行中：暖阳橙渐变 (正在服务中) */
.hero-serving { background: linear-gradient(135deg, #ff9a44 0%, #fc6076 100%); }

/* 已完成：薄荷绿渐变 (安全达成) */
.hero-completed { background: linear-gradient(135deg, #00b894 0%, #55efc4 100%); }

/* 待评价：靛青色渐变 (官方质感) */
.hero-toreview { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); }

/* 已评价：翠绿色渐变 (圆满结束) */
.hero-finished { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }

/* 已取消：冷灰色渐变 (失效) */
.hero-cancelled { background: linear-gradient(135deg, #b2bec3 0%, #636e72 100%); }

.hero-default { background: #11998e; }

.hero-content { position: relative; z-index: 2; }
.status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.status-main { display: flex; align-items: center; gap: 10px; }
.status-icon-anim { font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
.status-text { font-size: 30px; font-weight: 900; letter-spacing: 1px; }
.order-id { font-size: 13px; opacity: 0.7; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; backdrop-filter: blur(5px); }
.status-desc { font-size: 14px; opacity: 0.9; margin-top: 10px; font-weight: 500; }
.countdown-text { color: #ffeaa7; font-weight: 800; font-family: 'DIN Alternate'; margin: 0 4px; }
.hero-arc { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: #f8fafc; border-radius: 40px 40px 0 0; }

/* 2. 悬浮容器与玻璃卡片 */
.floating-container { margin-top: -70px; padding: 0 16px; position: relative; z-index: 5; }

.glass-card { 
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); 
  border-radius: 24px; padding: 20px; margin-bottom: 16px; 
  border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 10px 25px rgba(0,0,0,0.03); 
}
.p-info-box { display: flex; align-items: center; gap: 16px; }
.p-avatar-wrap { position: relative; }
.p-tag-badge { position: absolute; bottom: -2px; right: -2px; background: #ffd21e; color: #fff; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid #fff; }
.p-text { flex: 1; }
.p-name { font-size: 18px; font-weight: 800; color: #1a1a1a; margin-bottom: 4px; }
.p-rating { display: flex; align-items: center; gap: 6px; }
.p-score { font-size: 12px; color: #ff9900; font-weight: 700; }
.p-actions { display: flex; gap: 12px; }
.circle-btn { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.circle-btn.chat { background: #e0f2fe; color: #0ea5e9; }
.circle-btn.phone { background: #eefaf8; color: #11998e; }

/* 3. 详情白卡与时间轴 */
.detail-white-card { background: #fff; border-radius: 24px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
.dw-title { font-size: 15px; font-weight: 900; color: #1e293b; margin-bottom: 16px; }
.dw-item { display: flex; justify-content: space-between; margin-bottom: 14px; }
.dw-label { font-size: 13px; color: #94a3b8; font-weight: 600; }
.dw-val { font-size: 14px; font-weight: 700; color: #1e293b; text-align: right; flex: 1; margin-left: 20px; }
.dw-val.highlight { color: #11998e; }

/* 陪诊专项样式 */
.patient-medical-card {
  padding: 20px;
}
.pmc-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.pmc-avatar {
  width: 48px;
  height: 48px;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 900;
}
.pmc-info {
  flex: 1;
}
.pmc-name {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}
.pmc-meta {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
}
.pmc-hospital {
  text-align: right;
  font-size: 13px;
  color: #4f46e5;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.pmc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pmc-tag {
  font-size: 11px;
  font-weight: 700;
}

/* 医疗动态看板原子级升级版 */
.medical-live-dashboard {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #f1f5f9;
}

.mld-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #f8fafc;
  padding-bottom: 12px;
}

.mld-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 900;
  color: #1a1a1a;
}

.mld-timer {
  font-size: 11px;
  color: #11998e;
  background: #eefaf8;
  padding: 4px 10px;
  border-radius: 100px;
  font-weight: 700;
}

.mld-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mld-section {
  background: #f8fafc;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
  padding-bottom: 12px;
}

.mld-section.highlight {
  background: #fff7ed;
  border: 1px solid #ffedd5;
}

.mld-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.mld-row.no-bg {
  background: transparent;
}

.mld-sub-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 0 12px 4px;
}

.mld-sub-grid :deep(.van-image) {
  width: 100%;
  aspect-ratio: 1;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.mr-icon {
  width: 36px;
  height: 36px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #11998e;
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
}

.mr-content {
  flex: 1;
}

.mr-label {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 2px;
  font-weight: 600;
}

.mr-val {
  font-size: 14px;
  color: #1e293b;
  font-weight: 700;
}

.mr-arrow {
  font-size: 14px;
  color: #cbd5e1;
}

.mr-right .dr-btn {
  border: 1px solid #11998e !important;
  color: #11998e !important;
}

.mld-waiting {
  text-align: center;
  padding: 20px 0;
  font-size: 12px;
  color: #94a3b8;
}

.ellipsis-1 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}

.mr-icon.advice { background: #eef2ff; color: #4f46e5; }
.mr-icon.bill { background: #fff7ed; color: #f97316; }
.mr-icon.drug { background: #fdf2f8; color: #db2777; }
.mr-icon.check { background: #f0fdf4; color: #16a34a; }

.mr-val.placeholder {
  color: #ccc;
  font-weight: 500;
  font-style: normal;
}

.mld-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.verified-badge {
  font-size: 11px;
  color: #07c160;
  background: #eefaf5;
  padding: 2px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 700;
}

.dish-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; flex: 1; }

/* 陪诊服务者专业名片重构 */
.provider-pro-panel {
  padding: 32px 24px 40px;
  background: white;
}
.pro-avatar-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}
.pro-avatar {
  border: 3px solid #f8fafc;
  box-shadow: 0 8px 20px rgba(0,0,0,0.05);
}
.pro-name {
  font-size: 22px;
  font-weight: 900;
  color: #1e293b;
  margin-right: 8px;
}
.pro-rating-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.pro-score {
  font-size: 14px;
  font-weight: 800;
  color: #faad14;
}
.pro-badge-row {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}
.pro-badge {
  flex: 1;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
}
.pro-badge.medical {
  background: #eef2ff;
  color: #4f46e5;
}
.pro-badge.safety {
  background: #f0fdf4;
  color: #16a34a;
}

.pro-stats-card {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 20px;
  padding: 24px 0;
  margin-bottom: 32px;
}
.pro-stat-item {
  flex: 1;
  text-align: center;
}
.ps-val {
  font-size: 20px;
  font-weight: 900;
  color: #1e293b;
  font-family: 'DIN Alternate';
  margin-bottom: 4px;
}
.ps-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 700;
  text-transform: uppercase;
}
.ps-sep {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
}

.pro-section {
  margin-bottom: 32px;
}
.pro-sec-title {
  font-size: 15px;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 16px;
}
.pro-cert-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.pro-cert-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.3;
  filter: grayscale(1);
}
.pro-cert-box.active {
  opacity: 1;
  filter: grayscale(0);
}
.pro-cert-box van-icon {
  font-size: 24px;
  color: #11998e;
}
.pro-cert-box span {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.pro-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pro-didi-tag {
  background: #f1f5f9;
  color: #64748b;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
}

.pro-action-footer {
  margin-top: 40px;
}
.pro-btn-contact {
  height: 54px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  font-weight: 800;
  font-size: 16px;
  box-shadow: 0 10px 25px rgba(17, 153, 142, 0.2);
}

.node-steps { margin-top: 10px; padding-left: 10px; }
.node-step { position: relative; padding-bottom: 24px; border-left: 2px solid #f1f5f9; padding-left: 24px; }
.node-step:last-child { border-left: none; }
.ns-dot { position: absolute; left: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #e2e8f0; border: 2px solid #fff; }
.node-step.active .ns-dot { background: #11998e; box-shadow: 0 0 0 4px rgba(17, 153, 142, 0.1); }
.ns-title { font-size: 14px; font-weight: 800; color: #475569; margin-bottom: 4px; }
.node-step.active .ns-title { color: #1e293b; }
.ns-time { font-size: 12px; color: #94a3b8; }

/* 4. 周期排期 */
.timeline-track { margin-top: 10px; }
.time-node { display: flex; gap: 16px; padding-bottom: 20px; }
.node-left { display: flex; flex-direction: column; align-items: center; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #eee; margin-top: 6px; }
.line { flex: 1; width: 2px; background: #f5f5f5; margin: 4px 0 -4px; }
.time-node:last-child .line { display: none; }
.time-node.active .dot { background: #11998e; box-shadow: 0 0 0 4px rgba(17, 153, 142, 0.1); }
.node-right { flex: 1; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 16px; border-radius: 16px; }
.n-date { font-size: 14px; font-weight: 800; color: #1e293b; }
.n-status { font-size: 11px; color: #94a3b8; }
.n-actions { display: flex; gap: 8px; }
.n-btn { border-radius: 8px !important; font-size: 10px !important; padding: 0 8px !important; height: 26px !important; }

/* 5. 费用卡片 */
.fee-card { border: 1px solid rgba(17, 153, 142, 0.05); }
.dw-divider { height: 1px; background: #f1f5f9; margin: 16px 0; }
.total-row .dw-label { color: #1e293b; font-size: 15px; }
.price-text { color: #ef4444 !important; font-size: 22px !important; font-family: 'DIN Alternate', sans-serif; }

/* 6. 底部操作 */
.action-footer { 
  position: fixed; bottom: 0; left: 0; right: 0; padding: 16px 20px calc(24px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); z-index: 100; border-top: 1px solid rgba(0,0,0,0.05);
}
.btn-primary { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; color: #fff !important; border: none !important; font-weight: 800; border-radius: 18px !important; height: 54px; box-shadow: 0 10px 20px rgba(17, 153, 142, 0.2); }
.btn-secondary { background: #f1f5f9 !important; color: #64748b !important; border: none !important; font-weight: 800; border-radius: 18px !important; height: 54px; }
.btn-cancel { background: #f1f5f9 !important; color: #64748b !important; border: none !important; font-weight: 800; border-radius: 18px !important; height: 54px; }
.serving-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.serving-actions.no-grid { display: block; }

/* 弹窗升级 */
.provider-info-popup { background: #fff; }
.panel-stats-grid { display: flex; justify-content: space-around; background: #f8fafc; border-radius: 20px; padding: 20px 10px; margin: 24px 20px; }
.stat-box { flex: 1; text-align: center; position: relative; }
.stat-box:not(:last-child)::after { content: ''; position: absolute; right: 0; top: 20%; height: 60%; width: 1px; background: #e2e8f0; }
.stat-val { font-size: 20px; font-weight: 900; color: #1e293b; margin-bottom: 4px; font-family: 'DIN Alternate'; }
.stat-label { font-size: 12px; color: #94a3b8; font-weight: 700; }
.didi-tag { background: #f1f5f9; color: #64748b; padding: 8px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; }
.cert-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cert-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #11998e; background: #eefaf8; padding: 10px 14px; border-radius: 12px; font-weight: 700; }

.live-marker { font-size: 24px; animation: bounce 1s infinite alternate; }
.start-wait-dot { width: 12px; height: 12px; background: #11998e; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 4px rgba(17, 153, 142, 0.2); }
@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-5px); } }

/* 评价弹窗样式 */
.review-premium-popup { background: #fff; }
.review-container { padding: 0; }
.review-header { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f8fafc; }
.r-title { font-size: 18px; font-weight: 900; color: #1e293b; }
.review-content { padding: 24px 20px; }
.rate-box { text-align: center; margin-bottom: 30px; }
.r-label { font-size: 14px; color: #94a3b8; margin-bottom: 12px; font-weight: 700; }
.review-input { background: #f8fafc; border-radius: 20px; padding: 16px; margin-bottom: 30px; }
.submit-action { margin-top: 20px; }
.btn-submit { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; height: 50px; font-size: 16px; border: none !important; color: #fff !important; font-weight: 800; border-radius: 18px !important; }

.bottom-padding-gap { height: 120px; }
</style>
