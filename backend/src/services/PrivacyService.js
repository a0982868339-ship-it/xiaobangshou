/**
 * PrivacyService - 集中隐私保护与数据脱敏服务
 * 提供统一的脱敏算法与基于角色的字段过滤逻辑
 */
class PrivacyService {
    /**
     * 脱敏类型定义
     */
    static TYPES = {
        PHONE: 'phone',
        ADDRESS: 'address',
        REAL_NAME: 'real_name',
        ID_CARD: 'id_card'
    };

    /**
     * 通用脱敏方法
     * @param {string} text 原文
     * @param {string} type 脱敏类型
     */
    static mask(text, type) {
        if (!text) return text;

        switch (type) {
            case this.TYPES.PHONE:
                // 13812345678 -> 138****5678
                return text.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

            case this.TYPES.ADDRESS:
                // 某某省某某市某某区某某街道123号 -> 某某省某某市某某区***
                if (text.length <= 6) return '***';
                return text.substring(0, 6) + '***';

            case this.TYPES.REAL_NAME:
                // 张三 -> 张* | 欧阳锋 -> 欧**
                if (text.length <= 1) return text;
                return text[0] + '*'.repeat(text.length - 1);

            case this.TYPES.ID_CARD:
                // 110101199001011234 -> 110101**********1234
                return text.replace(/(\d{6})\d{8,10}(\d{4})/, '$1**********$2');

            default:
                return text;
        }
    }

    /**
     * 根据角色处理订单敏感数据
     * @param {Object} order 订单数据
     * @param {string} role 当前查看者角色 (user, provider, admin)
     * @param {number} viewerId 当前查看者用户ID
     */
    static handleOrderPrivacy(order, role, viewerId) {
        const isOwner = order.user_id === viewerId;
        const isAssignedProvider = order.provider_user_id === viewerId; // 注意 provider_user_id 是 users 表 ID
        const isAdmin = ['admin', 'support'].includes(role);

        // 如果既不是主人，也不是承接者，也不是管理员 -> 高度脱敏 (如：抢单广场看别的单)
        if (!isOwner && !isAssignedProvider && !isAdmin) {
            return {
                ...order,
                contact_phone: this.mask(order.contact_phone, this.TYPES.PHONE),
                service_address: this.mask(order.service_address, this.TYPES.ADDRESS),
                user_nickname: this.mask(order.user_nickname, this.TYPES.REAL_NAME)
            };
        }

        // 如果是接单师傅看自己的单 -> 正常展示 (或根据业务逻辑决定是否在特定状态前也脱敏)
        return order;
    }
}

module.exports = PrivacyService;
