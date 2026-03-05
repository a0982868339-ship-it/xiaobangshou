<template>
  <div class="result-dashboard shadow-card">
    <!-- 1. 轨迹类服务成果 (如遛狗) - 升级版战报 -->
    <div v-if="isTrackService" class="track-result-premium">
      <div class="premium-header">
        <div class="p-title-group">
          <div class="p-icon-bg">
            <van-icon name="guide-o" />
          </div>
          <div class="p-text-info">
            <div class="p-main-title">遛狗成果战报</div>
            <div class="p-sub-title">{{ walkingStatusText }}</div>
          </div>
        </div>
        <div class="p-badge" :class="{ 'is-live': order.is_walking === 1 }">
          <van-icon :name="order.is_walking === 1 ? 'aim' : 'passed'" />
          <span>{{ order.is_walking === 1 ? '实时录制中' : '服务已达成' }}</span>
        </div>
      </div>

      <div class="map-wrapper">
        <div :id="'track-map-' + order.id" class="track-map-container-premium" @click="$emit('expand-map')"></div>
        <div class="map-overlay-hint">点击放大查看全景</div>
      </div>

      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="sc-icon blue"><van-icon name="location" /></div>
          <div class="sc-info">
            <div class="sc-label">累计里程</div>
            <div class="sc-value-group">
              <span class="sc-number">{{ walkingDistance }}</span>
              <span class="sc-unit">km</span>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="sc-icon orange"><van-icon name="clock" /></div>
          <div class="sc-info">
            <div class="sc-label">运动时长</div>
            <div class="sc-value-group">
              <span class="sc-number">{{ walkingDurationFormatted }}</span>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="sc-icon green"><van-icon name="speedometer" /></div>
          <div class="sc-info">
            <div class="sc-label">平均步速</div>
            <div class="sc-value-group">
              <span class="sc-number">{{ averageSpeed }}</span>
              <span class="sc-unit">km/h</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 轨迹类服务补充：现场报告 (第一、二、三阶段) -->
      <div v-if="tags.length > 0 || images.length > 0 || notes || proofData" class="track-report-addon">
        <div class="report-divider"></div>
        
        <!-- 遛狗专项战报：结构化分段卡片展示 -->
        <template v-if="isTrackService && proofData">
          <!-- 1. 接狗确认卡片 (补全第一阶段，显示位置对齐蓝框) -->
          <div class="detail-white-card" :style="{ marginBottom: '16px', padding: '16px' }">
            <div class="mld-row" :style="{ padding: '0 0 12px 0' }">
              <div class="mr-icon check"><van-icon name="logistics" /></div>
              <div class="mr-content">
                <div class="mr-label">第一阶段：门牌号/入场录像</div>
                <div class="mr-val" v-if="getEntryVideo">接狗凭证视频已存档</div>
                <div class="mr-val" v-else :style="{ color: '#94a3b8', fontWeight: 500 }">需录制门牌号及开启过程</div>
              </div>
            </div>
            <div v-if="getEntryVideo" class="video-card-mini" @click="playVideo(getEntryVideo)" :style="{ height: '180px' }">
              <video :src="getEntryVideo" class="video-cover" preload="metadata"></video>
              <div class="play-overlay"><van-icon name="play-circle-o" /></div>
            </div>
            <div v-else :style="{ background: '#f8fafc', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px dashed #e2e8f0' }">
              <van-icon name="shield-o" size="32" color="#cbd5e1" />
              <div :style="{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }">入场过程已在后台安全备案</div>
            </div>
          </div>

          <!-- 2. 运动轨迹卡片 -->
          <div class="detail-white-card" v-if="proofData.walking_proof?.length > 0" :style="{ marginBottom: '16px', padding: '16px' }">
            <div class="mld-row" :style="{ padding: '0 0 12px 0' }">
              <div class="mr-icon advice"><van-icon name="photograph" /></div>
              <div class="mr-content">
                <div class="mr-label">第二阶段：铲屎/换水/清扫</div>
                <div class="mr-val">请拍摄清理后的猫砂盆与水盆</div>
              </div>
            </div>
            <div class="mld-sub-grid">
              <van-image 
                v-for="(item, idx) in proofData.walking_proof" 
                :key="idx" :src="item.url" fit="cover" radius="8"
                @click="showImagePreview(proofData.walking_proof.map(p => p.url), idx)"
              />
            </div>
          </div>

          <!-- 3. 送回确认卡片 -->
          <div class="detail-white-card" v-if="getExitVideo" :style="{ marginBottom: '16px', padding: '16px' }">
            <div class="mld-row" :style="{ padding: '0 0 12px 0' }">
              <div class="mr-icon drug"><van-icon name="home-o" /></div>
              <div class="mr-content">
                <div class="mr-label">第三阶段：15秒喂食/互动视频</div>
                <div class="mr-val">记录猫咪进食状态与精神面貌</div>
              </div>
            </div>
            <div class="video-card-mini" @click="playVideo(getExitVideo)" :style="{ height: '180px' }">
              <video :src="getExitVideo" class="video-cover"></video>
              <div class="play-overlay"><van-icon name="play-circle-o" /></div>
          </div>
        </div>
      </template>

      <div class="report-header" v-if="!proofData">
          <van-icon name="photograph" />
          <span>现场服务反馈</span>
        </div>
        
        <!-- 标签 -->
        <div v-if="tags.length > 0" class="p-tag-display-grid">
          <div 
            v-for="tag in tags" 
            :key="tag" 
            class="p-display-tag"
            :style="{ '--tag-color': '#07c160', '--tag-bg': '#eefaf5' }"
          >
            <van-icon name="success" />
            {{ tag }}
          </div>
        </div>

        <!-- 图片 (结构化订单下隐藏此冗余区域) -->
        <div v-if="images.length > 0 && !proofData" class="photo-grid" :class="gridClass">
          <van-image
            v-for="(img, index) in images"
            :key="index"
            :src="img"
            fit="cover"
            radius="12"
            class="grid-img"
            @click="previewImages(index)"
          />
        </div>

        <!-- 备注 -->
        <div v-if="notes" class="provider-notes-mini">
          <div class="notes-content">“{{ notes }}”</div>
        </div>
      </div>
    </div>

    <!-- 2. 非轨迹类服务成果 (如喂猫、保洁) -->
    <div v-else class="general-result">
      <div class="result-header">
        <div class="r-title">
          <van-icon name="shield-check-o" color="#07c160" />
          <span>服务成果报告</span>
        </div>
        <div class="verified-badge">
          <van-icon name="passed" /> 已验证
        </div>
      </div>

      <!-- [核心隔离] 只要是宠物类订单，就启用三段式高级展示 -->
      <template v-if="(Number(order.service_id) === 37 || Number(order.service_id) === 36 || order.service_name?.includes('宠物') || order.service_name?.includes('猫') || order.service_name?.includes('狗'))">
        <div v-if="proofData">
          <!-- 1. 门牌号确认 (适配录像或照片) -->
          <div class="mld-section" v-if="getEntryVideo">
            <div class="mld-row">
              <div class="mr-icon check"><van-icon name="logistics" /></div>
              <div class="mr-content">
                <div class="mr-label">第一阶段：门牌号/入场录像</div>
                <div class="mr-val" v-if="isMediaVideo(getEntryVideo)">入场凭证视频已存档</div>
                <div class="mr-val" v-else>门牌号/入场照片已存档</div>
              </div>
            </div>
            <!-- 媒体展示区 -->
            <div class="mld-media-container">
              <!-- 视频播放器 -->
              <div v-if="isMediaVideo(getEntryVideo)" class="video-card-mini" @click="playVideo(getEntryVideo)">
                <video :src="getEntryVideo" class="video-cover"></video>
                <div class="play-overlay"><van-icon name="play-circle-o" /></div>
              </div>
              <!-- 图片展示 -->
              <div v-else class="mld-sub-grid">
                <van-image 
                  :src="getEntryVideo" fit="cover" radius="8" class="grid-img"
                  @click="showImagePreview([getEntryVideo], 0)"
                />
              </div>
            </div>
          </div>

          <!-- 2. 环境清理/运动记录 -->
          <div class="mld-section" v-if="proofData.environment?.images?.length > 0 || (proofData.walking_proof && proofData.walking_proof.length > 0)">
            <div class="mld-row">
              <div class="mr-icon advice"><van-icon :name="order.service_id === 36 ? 'photograph' : 'brush-o'" /></div>
              <div class="mr-content">
                <div class="mr-label">第二阶段：铲屎/换水/清扫</div>
                <div class="mr-val">清理后的结果照片已上传</div>
              </div>
            </div>
            <div class="mld-media-container">
              <div class="mld-sub-grid">
                <van-image 
                  v-for="(img, idx) in (order.service_id === 36 ? (proofData.walking_proof || []).map(p => p.url) : (proofData.environment?.images || []))" 
                  :key="idx" :src="normalizeUrl(img)" fit="cover" radius="8" class="grid-img"
                  @click="showImagePreview((order.service_id === 36 ? (proofData.walking_proof || []).map(p => p.url) : (proofData.environment?.images || [])).map(u => normalizeUrl(u)), idx)"
                />
              </div>
            </div>
          </div>

        <!-- 3. 服务成果/互动视频 (适配录像或照片) -->
          <div class="mld-section" v-if="getExitVideo">
            <div class="mld-row">
              <div class="mr-icon drug"><van-icon :name="order.service_id === 36 ? 'passed' : 'smile-o'" /></div>
              <div class="mr-content">
                <div class="mr-label">第三阶段：15秒喂食/互动视频</div>
                <div class="mr-val" v-if="isMediaVideo(getExitVideo)">互动反馈视频已存档</div>
                <div class="mr-val" v-else>宠物状态反馈照片已存档</div>
              </div>
            </div>
            <!-- 媒体展示区 -->
            <div class="mld-media-container">
              <!-- 视频播放器 -->
              <div v-if="isMediaVideo(getExitVideo)" class="video-card-mini" @click="playVideo(getExitVideo)">
                <video :src="getExitVideo" class="video-cover"></video>
                <div class="play-overlay"><van-icon name="play-circle-o" /></div>
              </div>
              <!-- 图片展示 -->
              <div v-else class="mld-sub-grid">
                <van-image 
                  :src="getExitVideo" fit="cover" radius="8" class="grid-img"
                  @click="showImagePreview([getExitVideo], 0)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 普通订单通用展示逻辑 (非周期宠物单或非宠物单) -->
      <template v-else>
        <!-- 扁平照片墙 (支持视频识别) -->
        <div v-if="images.length > 0" class="photo-grid" :class="gridClass">
          <template v-for="(img, index) in images" :key="index">
            <!-- 兼容视频后缀渲染 -->
            <div v-if="isMediaVideo(img)" class="video-card-mini" @click="playVideo(normalizeUrl(img))" style="height: 120px; margin-bottom: 8px;">
              <video :src="normalizeUrl(img)" class="video-cover" preload="metadata"></video>
              <div class="play-overlay" style="font-size: 24px;"><van-icon name="play-circle-o" /></div>
            </div>
            <van-image v-else :src="normalizeUrl(img)" fit="cover" radius="12" class="grid-img" @click="previewImages(index)" style="margin-bottom: 8px;" />
          </template>
        </div>
      </template>

      <!-- 3. 做饭业务：买菜存证展示 (通用位置) -->
      <div class="detail-white-card" v-if="order.grocery_actual_amount" :style="{ margin: '16px 0', padding: '16px', borderLeft: '4px solid #4f46e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }">
        <div class="mld-row" :style="{ padding: '0 0 12px 0' }">
          <div class="mr-icon" style="background: #eef2ff; color: #4f46e5;"><van-icon name="shopping-cart-o" /></div>
          <div class="mr-content">
            <div class="mr-label">代买食材结算</div>
            <div class="mr-val" style="color: #ef4444; font-size: 18px; font-family: 'DIN Alternate';">¥ {{ order.grocery_actual_amount }}</div>
          </div>
          <van-tag type="primary" plain>线下已结清</van-tag>
        </div>
        
        <!-- 凭证照片 -->
        <div v-if="order.receipt_image" style="margin-top: 8px;">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">支付凭证/小票</div>
          <div class="mld-sub-grid">
            <van-image 
              v-for="(img, idx) in parseJSON(order.receipt_image)" 
              :key="idx" :src="normalizeUrl(img)" fit="cover" radius="8"
              @click="showImagePreview(parseJSON(order.receipt_image).map(u => normalizeUrl(u)), idx)"
            />
          </div>
        </div>

        <!-- 称重视频 -->
        <div v-if="order.weighing_video" style="margin-top: 16px;">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; font-weight: 600;">称重/计价视频</div>
          <div class="video-card-mini" @click="playVideo(normalizeUrl(order.weighing_video))" :style="{ height: '150px' }">
            <video :src="normalizeUrl(order.weighing_video)" class="video-cover" preload="metadata"></video>
            <div class="play-overlay"><van-icon name="play-circle-o" /></div>
          </div>
        </div>
      </div>

      <!-- 成果标签 (始终尝试显影) -->
      <div v-if="tags.length > 0" class="p-tag-display-grid" style="margin-top: 16px;">
        <div v-for="tag in tags" :key="tag" class="p-display-tag" :style="{ '--tag-color': '#07c160', '--tag-bg': '#eefaf5' }">
          <van-icon name="success" />
          {{ tag }}
        </div>
      </div>

      <!-- 师傅嘱托 -->
      <div v-if="notes" class="provider-notes">
        <div class="notes-bubble">
          <div class="bubble-arrow"></div>
          <div class="notes-header"><van-icon name="chat-o" /> 师傅嘱托</div>
          <div class="notes-content">{{ notes }}</div>
        </div>
      </div>

      <!-- 空状态兜底 (逻辑加固：只有完全没数据且非周期单才显示) -->
      <van-empty v-if="!proofData && tags.length === 0 && images.length === 0 && !notes && !(order.checklist && order.checklist.length > 0)" image-size="40" description="服务进行中，暂无成果报告" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, nextTick } from 'vue';
import { showImagePreview } from 'vant';
import { loadAMap } from '../utils/amap';

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  walkingDuration: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['expand-map']);

let trackMap = null;
let trackPolyline = null;
let trackMarker = null;
let startMarker = null;
let endMarker = null;

const isTrackService = computed(() => {
  return props.order.service_name && props.order.service_name.includes('遛狗');
});

const initMap = async () => {
  if (!isTrackService.value) return;
  
  const points = parseJSON(props.order.service_track || props.order.live_track);
  await loadAMap();
  
  const lng = Number(props.order.service_longitude)
  const lat = Number(props.order.service_latitude)
  const defaultCenter = (lng && lat) ? [lng, lat] : [116.397428, 39.90923];

  await nextTick();
  const mapId = 'track-map-' + props.order.id;
  const mapEl = document.getElementById(mapId);
  if (!mapEl) return;

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
    });
  } else {
    trackMap.setCenter((points && points.length > 0) ? points[points.length - 1] : defaultCenter)
  }

  if (!points || points.length === 0) {
    if (trackMarker) trackMap.remove(trackMarker)
    trackMarker = new AMap.Marker({ 
      position: defaultCenter, 
      content: '<div class="start-wait-dot" style="width: 14px; height: 14px; background: #11998e; border-radius: 50%; border: 2px solid #fff;"></div>', 
      offset: new AMap.Pixel(-7, -7) 
    });
    trackMap.add(trackMarker);
    return;
  }

  // 移除旧标记防止冲突
  if (startMarker) trackMap.remove(startMarker)
  if (endMarker) trackMap.remove(endMarker)

  // 1. 绘制起点
  startMarker = new AMap.Marker({ 
    position: points[0], 
    icon: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png', 
    offset: new AMap.Pixel(-13, -30),
    zIndex: 100
  });
  trackMap.add(startMarker)

  // 2. 绘制/更新当前位置(狗头) 或 终点
  if (props.order.status === 2) {
    // 服务中：显示狗头
    if (trackMarker) {
      trackMarker.setPosition(points[points.length - 1]);
      if (!trackMap.getAllOverlays('marker').includes(trackMarker)) {
        trackMap.add(trackMarker)
      }
    } else {
      trackMarker = new AMap.Marker({ 
        position: points[points.length - 1], 
        content: '<div class="live-marker" style="font-size: 32px;">🐶</div>', 
        offset: new AMap.Pixel(-16, -16),
        zIndex: 110
      });
      trackMap.add(trackMarker);
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
    });
    trackMap.add(endMarker);
  }

  // 3. 绘制/更新轨迹线
  if (trackPolyline) {
    trackPolyline.setPath(points);
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
    });
    trackMap.add(trackPolyline);
  }
  
  trackMap.setFitView([trackPolyline], false, [60, 60, 60, 60]);
};

onMounted(() => {
  setTimeout(initMap, 300);
});

onUnmounted(() => {
  if (trackMap) {
    trackMap.destroy();
    trackMap = null;
  }
});

const walkingStatusText = computed(() => {
  if (props.order.is_walking === 1) return '正在遛狗中...';
  if (props.order.status === 2) return '师傅已接到狗，准备出发';
  return '服务已圆满完成';
});

const walkingDistance = computed(() => {
  const points = parseJSON(props.order.service_track || props.order.live_track);
  return ((points.length || 0) * 0.02).toFixed(2);
});

const walkingDurationFormatted = computed(() => {
  const seconds = props.walkingDuration;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const averageSpeed = computed(() => {
  if (props.walkingDuration <= 0) return '0.00';
  const hours = props.walkingDuration / 3600;
  return (parseFloat(walkingDistance.value) / hours).toFixed(2);
});

const proofData = computed(() => {
  const raw = props.order.proof_data;
  
  let parsed = null;
  try {
    parsed = (raw && raw !== 'null') ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
  } catch (e) {
    console.error('>> [ResultDashboard] Parse proof_data error:', e);
  }

  // 严格校验：如果解析出来的对象没有任何实际内容，则视为 null
  if (parsed) {
    const hasEntry = parsed.entry_proof || parsed.entry?.video;
    const hasWalking = parsed.walking_proof?.length > 0 || parsed.environment?.images?.length > 0;
    const hasExit = parsed.exit_proof || parsed.interaction?.video;
    
    if (!hasEntry && !hasWalking && !hasExit) {
      return null;
    }
  }
  
  return parsed;
});

const normalizeUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  // 统一通过 /uploads 代理访问，确保不论是 'uploads/xx' 还是 '/uploads/xx' 都能正确解析
  return `/${url.startsWith('/') ? url.substring(1) : url}`;
};

const getEntryVideo = computed(() => {
  const pd = proofData.value;
  if (!pd) return null;
  const url = pd.entry_proof || pd.entry?.video || pd.plateVideo || (pd.entry && typeof pd.entry === 'string' ? pd.entry : null);
  return normalizeUrl(url);
});

const getExitVideo = computed(() => {
  const pd = proofData.value;
  if (!pd) return null;
  const url = pd.exit_proof || pd.interaction?.video || (pd.interaction && typeof pd.interaction === 'string' ? pd.interaction : null);
  return normalizeUrl(url);
});

const isMediaVideo = (url) => {
  if (!url) return false;
  return String(url).match(/\.(mp4|mov|avi|webm)$|video/i);
};

const playVideo = (url) => {
  if (!url) return;
  
  // 创建一个临时的视频元素进行全屏播放，不影响现有 UI 布局
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  video.style.position = 'fixed';
  video.style.top = '0';
  video.style.left = '0';
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.backgroundColor = 'black';
  video.style.zIndex = '9999';
  
  // 点击退出或播放结束自动移除
  const removePlayer = () => {
    if (document.body.contains(video)) {
      document.body.removeChild(video);
    }
  };
  
  video.onclick = removePlayer;
  video.onended = removePlayer;
  
  document.body.appendChild(video);
  
  // 尝试进入全屏模式
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  }
};

const tags = computed(() => {
  const t = parseJSON(props.order.completion_tags || props.order.report_tags || '[]');
  return Array.isArray(t) ? t : [];
});
const images = computed(() => parseJSON(props.order.report_images || props.order.proof_images || '[]'));
const notes = computed(() => props.order.medical_notes);

const gridClass = computed(() => {
  const count = images.value.length;
  if (count === 1) return 'grid-1';
  if (count === 2) return 'grid-2';
  if (count === 4) return 'grid-4';
  return 'grid-3';
});

const parseJSON = (str) => {
  if (!str) return [];
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return [];
  }
};

const getTagStyle = (tag) => {
  // 统一显示绿色风格，不再区分颜色
  return { bg: '#eefaf5', color: '#07c160' };
};

const previewImages = (index) => {
  showImagePreview({
    images: images.value,
    startPosition: index,
  });
};
</script>

<style scoped>
.result-dashboard {
  margin: 12px;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.shadow-card {
  border: 1px solid rgba(0,0,0,0.02);
}

/* 轨迹样式 - 升级版 */
.track-result-premium {
  padding: 16px;
  background: linear-gradient(to bottom, #ffffff, #fcfdfd);
}

.premium-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.p-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.p-icon-bg {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  box-shadow: 0 4px 10px rgba(17, 153, 142, 0.2);
}

.p-main-title {
  font-size: 16px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: 0.5px;
}

.p-sub-title {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.p-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f0f9eb;
  color: #67c23a;
  border-radius: 20px;
  font-size: 11px;
  font-weight: bold;
}

.p-badge.is-live {
  background: #ecf5ff;
  color: #409eff;
  animation: pulse-blue 2s infinite;
}

.map-wrapper {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.track-map-container-premium {
  height: 240px;
  width: 100%;
}

.map-overlay-hint {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  color: white;
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 10px;
  pointer-events: none;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-card {
  background: #f8fafc;
  padding: 12px 8px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.sc-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-bottom: 8px;
}

.sc-icon.blue { background: #e0f2fe; color: #0ea5e9; }
.sc-icon.orange { background: #fff7ed; color: #f97316; }
.sc-icon.green { background: #f0fdf4; color: #22c55e; }

.sc-label {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
  font-weight: 600;
}

.sc-value-group {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
}

.sc-number {
  font-size: 17px;
  font-weight: 900;
  color: #1e293b;
  font-family: 'DIN Alternate', sans-serif;
}

.sc-unit {
  font-size: 10px;
  color: #94a3b8;
  font-weight: bold;
}

@keyframes pulse-blue {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

/* 轨迹报告补充样式 */
.track-report-addon {
  margin-top: 24px;
}
.report-divider {
  height: 1px;
  background: #f1f5f9;
  margin-bottom: 20px;
}
.report-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 16px;
}
.provider-notes-mini {
  margin-top: 12px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
  border-left: 3px solid #11998e;
}
.provider-notes-mini .notes-content {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  font-style: italic;
}

/* 通用样式 */
.general-result {
  padding: 16px;
}
.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.r-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #323233;
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
}

/* 原子化标签展示样式 */
.p-tag-display-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.p-display-tag {
  padding: 6px 12px;
  background: var(--tag-bg, #f8fafc);
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  color: var(--tag-color, #64748b);
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.p-display-tag van-icon {
  font-size: 14px;
}

/* 照片墙 */
.photo-grid {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}
.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }

.grid-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border: 1px solid #f1f5f9;
  background: #f8fafc;
  min-height: 80px; /* 强制占位，防止塌陷 */
}

.mld-media-container {
  padding: 0 12px 12px;
}

/* 师傅嘱托气泡 */
.provider-notes {
  margin-top: 16px;
}
.notes-bubble {
  background: #f7f8fa;
  border-radius: 12px;
  padding: 12px;
  position: relative;
}
.notes-header {
  font-size: 13px;
  color: #969799;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.notes-content {
  font-size: 14px;
  color: #323233;
  line-height: 1.6;
}

/* 补全分类看板所需的布局样式 */
.mld-section {
  background: #f8fafc;
  border-radius: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
}

.mld-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
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

.mr-icon.check { background: #f0fdf4; color: #16a34a; }
.mr-icon.advice { background: #eef2ff; color: #4f46e5; }
.mr-icon.drug { background: #fdf2f8; color: #db2777; }

.mr-content { flex: 1; }
.mr-label { font-size: 11px; color: #94a3b8; margin-bottom: 2px; font-weight: 600; }
.mr-val { font-size: 14px; color: #1e293b; font-weight: 700; }

.mld-sub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 12px 4px;
}

.mld-sub-grid.grid-1 { grid-template-columns: 1fr; }

.video-card-mini {
  position: relative;
  width: 100%;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
}

.video-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 40px;
  color: rgba(255, 255, 255, 0.8);
}

/* 服务清单补充样式 */
.section-label-premium {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 12px;
}
.checklist-grid-premium {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 16px;
}
.mini-check-premium {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}
.mini-check-premium.completed {
  color: #1e293b;
}
</style>
