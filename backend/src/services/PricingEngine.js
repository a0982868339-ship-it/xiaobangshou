const configLoader = require('../utils/config');

/**
 * 计价引擎：负责所有业务类型的金额重算与校验
 */
class PricingEngine {
    /**
     * 计算订单总价
     * @param {Object} params 
     * @param {Object} service 
     * @param {Object} strategy 
     */
    static async calculatePrice(params, service, strategy) {
        const { orderType, serviceDays, clientPrice } = params;

        let finalBasePrice = 0;
        let optionAddPrice = 0;

        const options = params.serviceOptions ? (typeof params.serviceOptions === 'string' ? JSON.parse(params.serviceOptions) : params.serviceOptions) : {};
        let priceConfig = [];
        try {
            priceConfig = typeof service.price_config === 'string' ? JSON.parse(service.price_config) : (service.price_config || []);
        } catch (e) {
            console.error('>> [PricingEngine] Parse price_config error:', e);
        }

        // 1. 优先匹配时长规格
        const durationSpec = priceConfig.find(item =>
            (item.label.includes('分钟') || item.label.includes('小时')) &&
            (options[item.label] === 1 || options[item.label] === true || options[item.label] === '1')
        );

        if (durationSpec) {
            finalBasePrice = parseFloat(durationSpec.price);
            console.log(`>> [PricingEngine] Found duration spec: ${durationSpec.label}, price: ${finalBasePrice}`);
        } else {
            // 特殊逻辑：如果是做饭业务且用户选择了菜品，则基础起步价不再叠加，由菜品单价累加
            const isCookingService = service.name?.includes('做饭') || service.category_name?.includes('居家');
            const hasDishesSelected = Object.values(options).some(val => typeof val === 'number' && val > 0);
            
            if (isCookingService && hasDishesSelected) {
                finalBasePrice = 0;
                console.log(`>> [PricingEngine] Cooking service with dishes selected, setting base price to 0`);
            } else {
                finalBasePrice = parseFloat(service.base_price || 0);
                // 特殊情况：如果配置了全局宠物基础价且当前是宠物业务
                if (service.category_name?.includes('宠物')) {
                    const globalPetBase = await configLoader.getNumber('PET_BASE_PRICE', 0);
                    if (globalPetBase > 0 && finalBasePrice === 0) finalBasePrice = globalPetBase;
                }
                console.log(`>> [PricingEngine] Using base price: ${finalBasePrice}`);
            }
        }

        // 2. 计算非时长类的其他规格加价
        priceConfig.forEach(configItem => {
            const userValue = options[configItem.label];
            const isDuration = configItem.label.includes('分钟') || configItem.label.includes('小时');
            if (userValue && !isDuration) {
                if (typeof userValue === 'number' && userValue > 0) {
                    optionAddPrice += userValue * parseFloat(configItem.price);
                } else if (userValue === 1 || userValue === true || userValue === '1') {
                    optionAddPrice += parseFloat(configItem.price);
                }
            }
        });

        let calculatedSinglePrice = finalBasePrice + optionAddPrice;

        // 3. 调用业务策略计算额外费用
        if (strategy) {
            const extra = await strategy.calculateExtraPrice(params, service, options);
            console.log(`>> [PricingEngine] Strategy extra: ${extra}`);
            calculatedSinglePrice += extra;
        }

        // 4. 计算总次数与周期折扣
        const isPeriod = parseInt(orderType) === 1;
        const totalCount = (isPeriod && Array.isArray(serviceDays)) ? serviceDays.length : 1;
        let totalCalculatedPrice = calculatedSinglePrice * totalCount;

        if (isPeriod && totalCount >= 7) {
            totalCalculatedPrice = parseFloat((totalCalculatedPrice * 0.9).toFixed(2));
        }

        // 5. 校验金额一致性
        if (totalCalculatedPrice < 0.01) throw new Error('订单金额异常');
        if (clientPrice !== undefined && Math.abs(totalCalculatedPrice - parseFloat(clientPrice)) >= 0.01) {
            throw new Error(`订单金额已失效 (预期: ${totalCalculatedPrice.toFixed(2)}, 收到: ${clientPrice})`);
        }

        // 计算平台佣金
        const commissionRate = parseFloat(service.commission_rate || 10) / 100;
        const platformFee = (totalCalculatedPrice * commissionRate).toFixed(2);

        return {
            totalCalculatedPrice,
            platformFee,
            calculatedSinglePrice,
            totalCount,
            isPeriod
        };
    }
}

module.exports = PricingEngine;
