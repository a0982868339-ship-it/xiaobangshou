-- 数据库精细化重构 SQL
USE xiaobangshou;

-- 1. 清理原有分类和按摩相关服务
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `services`;
TRUNCATE TABLE `service_categories`;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. 插入精细化的一级分类
INSERT INTO service_categories (id, parent_id, name, icon, sort) VALUES
(1, 0, '陪诊服务', 'hospital-o', 100),
(2, 0, '宠物照顾', 'dog-o', 90),
(3, 0, '跑腿代办', 'todo-list-o', 80),
(4, 0, '居家办事', 'home-o', 70);

-- 3. 插入精细化的二级分类
INSERT INTO service_categories (parent_id, name, icon, sort) VALUES
-- 陪诊服务细化
(1, '诊前挂号代办', 'medal-o', 100),
(1, '成人全程陪诊', 'friends-o', 90),
(1, '儿童/老人专护陪诊', 'manager-o', 80),
(1, '诊后取药送药', 'logistics', 70),

-- 宠物照顾细化
(2, '上门喂猫(基础版)', 'smile-o', 100),
(2, '上门喂猫(多猫版)', 'like-o', 90),
(2, '专业遛狗(30分钟)', 'guide-o', 80),
(2, '专业遛狗(60分钟)', 'fire-o', 70),

-- 跑腿代办细化
(3, '代排队(政务/医院)', 'clock-o', 100),
(3, '帮办事(取送件/核实)', 'send-gift-o', 90),
(3, '帮买帮购(超市/药店)', 'shopping-cart-o', 80),

-- 居家办事细化
(4, '上门做饭(2菜1汤)', 'hot-o', 100),
(4, '上门做饭(4菜1汤)', 'star-o', 90),
(4, '收纳整理(单间)', 'apps-o', 80);

-- 4. 插入对应的精细化服务项目
-- 陪诊类
INSERT INTO services (category_id, name, description, base_price, unit, estimated_duration, status) VALUES
(5, '代挂号/取号', '协助预约挂号，现场排队取号，节省您的时间', 49.00, '次', 60, 1),
(6, '成人全程陪诊', '专业陪诊员全程陪同，协助诊间流转、缴费、打印报告', 128.00, '次', 240, 1),
(7, '老人专护陪诊', '专为行动不便老人 design，细心看护，关键医嘱实时同步家属', 158.00, '次', 240, 1),
(7, '养老院上门探访', '家属委托上门探访养老院老人，关注情绪与照护情况，形成记录反馈', 99.00, '次', 90, 1);

-- 宠物类
INSERT INTO services (category_id, name, description, base_price, unit, estimated_duration, status) VALUES
(9, '基础喂猫', '单猫家庭，包含添粮、换水、铲屎、简单陪玩', 35.00, '次', 30, 1),
(10, '多猫家庭精护', '3只及以上猫咪，详细记录饮食排泄情况，深度陪玩', 55.00, '次', 45, 1),
(11, '30分钟遛狗', '周边公园散步，及时处理粪便，拍摄视频反馈', 29.00, '次', 30, 1);

-- 居家类
INSERT INTO services (category_id, name, description, base_price, unit, estimated_duration, status) VALUES
(16, '上门做饭(简约)', '适合1-2人，2菜1汤，不含买菜时间', 68.00, '次', 90, 1);
