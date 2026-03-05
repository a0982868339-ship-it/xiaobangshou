<template>
  <div class="result-dashboard shadow-card">
    <!-- 1. 轨迹类服务成果 (如遛狗) -->
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
        <div id="track-map-dashboard" class="track-map-container-premium" @click="$emit('expand-map')"></div>
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

      <!-- 标签展示区 (升级为原子级药丸样式) -->
      <div v-if="tags.length > 0" class="p-tag-display-grid">
        <div 
          v-for="tag in tags" 
          :key="tag" 
          class="p-display-tag"
          :style="{ '--tag-color': getTagStyle(tag).color, '--tag-bg': getTagStyle(tag).bg }"
        >
          <van-icon name="success" />
          {{ tag }}
        </div>
      </div>

      <!-- 照片墙 -->
      <div v-if="images.length > 0" class="photo-grid" :class="gridClass">
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

      <!-- 师傅嘱托 -->
      <div v-if="notes" class="provider-notes">
        <div class="notes-bubble">
          <div class="bubble-arrow"></div>
          <div class="notes-header">
            <van-icon name="chat-o" /> 师傅嘱托
          </div>
          <div class="notes-content">{{ notes }}</div>
        </div>
      </div>

      <van-empty v-if="tags.length === 0 && images.length === 0 && !notes" image-size="40" description="服务进行中，暂无成果报告" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { showImagePreview } from 'vant';

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

const isTrackService = computed(() => {
  return props.order.service_name && props.order.service_name.includes('遛狗');
});

const walkingStatusText = computed(() => {
  if (props.order.is_walking === 1) return '正在遛狗中...';
  if (props.order.status === 2) return '服务中...';
  return '遛狗轨迹回顾';
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

const tags = computed(() => parseJSON(props.order.completion_tags || '[]'));
const images = computed(() => parseJSON(props.order.proof_images || '[]'));
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
  const envTags = ['打扫', '通风', '环境', '卫生', '清理'];
  const foodTags = ['喂食', '加粮', '换 water', '吃药', '加水', '进食'];
  const hygieneTags = ['铲屎', '洗猫砂盆', '清理', '消毒'];

  if (envTags.some(t => tag.includes(t))) {
    return { bg: '#eefaf5', color: '#07c160' }; // Environment - Green
  }
  if (foodTags.some(t => tag.includes(t))) {
    return { bg: '#fff7e6', color: '#fa8c16' }; // Eating - Orange
  }
  if (hygieneTags.some(t => tag.includes(t))) {
    return { bg: '#e6f7ff', color: '#1890ff' }; // Hygiene - Blue
  }
  return { bg: '#f5f5f5', color: '#666' };
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
  border: 1px solid #f0f0f0;
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

.live-tag {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
</style>
