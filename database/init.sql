-- 小帮手初始化数据
USE xiaobangshou;

-- 插入服务分类（一级分类）
INSERT INTO service_categories (id, parent_id, name, icon, sort, status) VALUES
(1, 0, '陪伴照护', 'icon-care', 100, 1),
(2, 0, '宠物服务', 'icon-pet', 90, 1),
(3, 0, '跑腿代办', 'icon-errand', 80, 1),
(4, 0, '居家服务', 'icon-home', 70, 1),
(5, 0, '健康养生', 'icon-health', 60, 1),
(6, 0, '教育培训', 'icon-education', 50, 1);

-- 插入服务分类（二级分类）
INSERT INTO service_categories (parent_id, name, icon, sort, status) VALUES
-- 陪伴照护
(1, '医院陪诊', 'icon-hospital', 100, 1),
(1, '陪伴老人', 'icon-elder', 95, 1),
(1, '陪聊陪玩', 'icon-chat', 90, 1),
(1, '接送服务', 'icon-pickup', 80, 1),

-- 宠物服务
(2, '上门喂养', 'icon-feed', 100, 1),
(2, '遛狗服务', 'icon-walk-dog', 90, 1),
(2, '宠物美容', 'icon-bath', 80, 1),
(2, '宠物寄养', 'icon-foster', 70, 1),

-- 跑腿代办
(3, '代购代买', 'icon-shopping', 100, 1),
(3, '代取快递', 'icon-express', 90, 1),
(3, '代排队', 'icon-queue', 80, 1),
(3, '文件递送', 'icon-document', 70, 1),

-- 居家服务（重点优化）
(4, '上门做饭', 'icon-cooking', 100, 1),
(4, '家政保洁', 'icon-clean', 90, 1),
(4, '家电维修', 'icon-repair', 80, 1),
(4, '临时保姆', 'icon-nanny', 85, 1),
(4, '收纳整理', 'icon-organize', 75, 1),
(4, '搬家搬运', 'icon-move', 70, 1),

-- 健康养生
(5, '上门按摩', 'icon-massage', 100, 1),
(5, '上门理发', 'icon-haircut', 90, 1),
(5, '上门修脚', 'icon-pedicure', 80, 1),

-- 教育培训
(6, '上门健身', 'icon-fitness', 100, 1),
(6, '作业辅导', 'icon-homework', 90, 1),
(6, '乐器陪练', 'icon-music', 80, 1);

-- 插入服务项目示例
INSERT INTO services (category_id, name, description, cover_image, base_price, unit, estimated_duration, notice, status) VALUES
-- 陪伴照护
(7, '医院陪诊服务', '专业陪诊人员，协助挂号、就诊、取药、检查等全流程陪同服务', '/static/images/services/pei-zhen.jpg', 80.00, '次', 180, '请提前预约，至少提前2小时下单', 1),
(8, '陪伴老人', '专业陪护员上门陪伴老人，聊天解闷、读报、散步等', '/static/images/services/elder-company.jpg', 60.00, '2小时', 120, '可长期预约，包月更优惠', 1),
(8, '养老院上门探访', '家属委托上门探访养老院老人，关注情绪与照护情况，形成记录反馈', '/static/images/services/nursing-visit.jpg', 99.00, '次', 90, '需取得老人或监护人授权，建议提前预约', 1),
(8, '老人陪就医', '陪同老人就医，全程照护，子女更放心', '/static/images/services/elder-medical.jpg', 80.00, '次', 180, '需要提前说明老人身体状况', 1),
(9, '陪聊陪玩', '专业陪护员陪老人聊天、下棋、打牌', '/static/images/services/chat-play.jpg', 50.00, '2小时', 120, '可指定陪护员', 1);

-- 宠物服务
INSERT INTO services (category_id, name, description, cover_image, base_price, unit, estimated_duration, notice, status) VALUES
(11, '上门喂猫', '专业宠物照料员上门喂养猫咪，换水、清理猫砂、陪玩', '/static/images/services/feed-cat.jpg', 30.00, '次', 30, '请提前告知宠物习性和注意事项', 1),
(11, '上门喂狗', '上门喂养狗狗，包含喂食、换水、简单陪玩', '/static/images/services/feed-dog.jpg', 35.00, '次', 30, '请确保宠物性情温顺', 1),
(12, '遛狗服务', '专业遛狗服务，30分钟/60分钟可选，保证狗狗运动量', '/static/images/services/walk-dog.jpg', 25.00, '次', 30, '大型犬需额外沟通', 1),
(13, '宠物上门美容', '专业美容师携带工具上门，洗澡、剪毛、修甲', '/static/images/services/pet-grooming.jpg', 80.00, '次', 90, '提前预约，小型犬起步价', 1);

-- 跑腿代办
INSERT INTO services (category_id, name, description, cover_image, base_price, unit, estimated_duration, notice, status) VALUES
(15, '超市代购', '帮您代购超市日用品、生鲜蔬果等', '/static/images/services/dai-gou.jpg', 10.00, '次', 60, '商品费用另付，支持线上支付', 1),
(16, '代取快递', '帮您代取快递，送货上门', '/static/images/services/express.jpg', 5.00, '次', 30, '请提前告知取件码', 1),
(17, '医院代排队', '医院挂号、检查等代排队服务', '/static/images/services/queue.jpg', 50.00, '小时', 60, '排队时间不确定，按实际计费', 1);

-- 居家服务（重点服务）
INSERT INTO services (category_id, name, description, cover_image, base_price, unit, estimated_duration, notice, status) VALUES
(19, '上门做饭（3菜1汤）', '专业厨师上门制作3菜1汤，食材新鲜可溯源，健康卫生', '/static/images/services/cooking-3.jpg', 128.00, '次', 150, '食材费用另计，可包月享优惠', 1),
(19, '上门做饭（5菜1汤）', '家宴首选，5菜1汤，适合家庭聚餐', '/static/images/services/cooking-5.jpg', 188.00, '次', 180, '需提前1天预约，可定制菜单', 1),
(19, '月子餐定制', '专业营养师+厨师，为产后妈妈提供营养月子餐', '/static/images/services/yuezi-meal.jpg', 298.00, '次', 180, '需提前沟通饮食禁忌', 1),
(19, '营养调理餐', '针对糖尿病、高血压等特殊人群的定制餐', '/static/images/services/health-meal.jpg', 168.00, '次', 150, '需提供医嘱 and 饮食要求', 1),
(20, '家庭保洁', '专业保洁人员，提供家庭日常保洁服务', '/static/images/services/clean.jpg', 120.00, '次', 120, '按房屋面积计费，90平米以内起步价', 1),
(21, '家电维修', '专业维修师傅，上门维修各类家电', '/static/images/services/repair.jpg', 50.00, '次', 60, '维修费用另议，先诊断后报价', 1),
(22, '临时保姆/钟点工', '临时家务帮手，做饭、保洁、照看老人小孩', '/static/images/services/hourly-worker.jpg', 50.00, '小时', 60, '最少预约2小时', 1),
(23, '收纳整理服务', '专业收纳师上门整理，让家焕然一新', '/static/images/services/organize.jpg', 200.00, '次', 180, '按空间计费，包含方案设计', 1);

-- 健康养生
INSERT INTO services (category_id, name, description, cover_image, base_price, unit, estimated_duration, notice, status) VALUES
(25, '上门按摩（肩颈）', '专业按摩师上门，缓解肩颈疲劳', '/static/images/services/massage-neck.jpg', 88.00, '30分钟', 30, '持证技师，自带按摩工具', 1),
(25, '上门按摩（全身）', '全身放松按摩，舒缓压力', '/static/images/services/massage-full.jpg', 168.00, '60分钟', 60, '可选择男/女技师', 1),
(25, '上门推拿理疗', '中医推拿，针对腰酸背痛、关节疼痛', '/static/images/services/tuina.jpg', 198.00, '90分钟', 90, '需说明身体状况', 1),
(26, '上门理发', '专业理发师上门服务，适合老人、行动不便人群', '/static/images/services/haircut.jpg', 50.00, '次', 45, '自带专业工具', 1);

-- 教育培训
INSERT INTO services (category_id, name, description, cover_image, base_price, unit, estimated_duration, notice, status) VALUES
(28, '上门健身私教', '专业健身教练1对1指导，在家就能锻炼', '/static/images/services/fitness.jpg', 150.00, '60分钟', 60, '教练携带基础器材，可定制计划', 1),
(29, '作业辅导', '大学生/退休教师上门辅导作业', '/static/images/services/homework.jpg', 60.00, '小时', 60, '按学科匹配老师', 1),
(30, '钢琴陪练', '音乐专业学生陪练，纠正指法和节奏', '/static/images/services/piano.jpg', 80.00, '小时', 60, '需家中有钢琴', 1);

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES
('platform_fee_rate', '0.05', '平台服务费率（5%）'),
('withdrawal_fee_rate', '0.01', '提现手续费率（1%）'),
('min_withdrawal_amount', '100', '最低提现金额'),
('order_cancel_time', '30', '订单自动取消时间（分钟）'),
('order_auto_complete_time', '24', '订单自动完成时间（小时）'),
('service_radius', '10', '服务半径（公里）'),
('customer_service_phone', '400-123-4567', '客服电话'),
('about_us', '小帮手是一个专业的本地生活服务平台...', '关于我们'),
('user_agreement', '用户协议内容...', '用户协议'),
('privacy_policy', '隐私政策内容...', '隐私政策');

-- 插入管理员账号（密码：admin123，需要加密后替换）
INSERT INTO admins (username, password, real_name, role, status) VALUES
('admin', '$2b$10$YourHashedPasswordHere', '超级管理员', 'super_admin', 1);

-- 注意：实际部署时需要：
-- 1. 修改管理员密码为加密后的密码
-- 2. 上传实际的服务图片
-- 3. 根据实际情况调整服务价格和配置
