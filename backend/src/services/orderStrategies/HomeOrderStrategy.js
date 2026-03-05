const BaseOrderStrategy = require('./BaseOrderStrategy');

/**
 * 居家办事策略 (核心逻辑：做饭计价)
 */
class HomeOrderStrategy extends BaseOrderStrategy {
  async validate(data, service) {
    if (service.name?.includes('做饭')) {
      // 兼容逻辑：优先从 dishDetails 取，没有则从 serviceOptions 解析
      const options = data.serviceOptions ? (typeof data.serviceOptions === 'string' ? JSON.parse(data.serviceOptions) : data.serviceOptions) : {};
      const hasDishes = (data.dishDetails && Object.keys(data.dishDetails).length > 0) || 
                        Object.keys(options).some(k => ['主菜', '副菜', '素菜', '汤类'].includes(k) && options[k] > 0);
      
      if (!hasDishes) {
        throw new Error('请选择要做的菜品');
      }
    }
    return true;
  }

  async calculateExtraPrice(data, service, options) {
    let extra = 0;
    // 修正：使用 service.name 并确保 needShopping 逻辑正确
    const isCooking = service.name?.includes('做饭') || service.category_name?.includes('居家');
    const needShopping = data.needShopping === 1 || data.needShopping === true || options.needShopping === true;
    
    if (isCooking && needShopping) {
      const configLoader = require('../../utils/config');
      const shoppingFeePerDish = await configLoader.getNumber('INGREDIENT_BUYING_FEE_PER_DISH', 5);
      // 计算菜品总数 (过滤掉非菜品字段)
      const dishKeys = ['主菜', '副菜', '素菜', '汤类'];
      const totalDishes = Object.keys(options).reduce((sum, key) => {
        if (dishKeys.includes(key)) {
          return sum + (typeof options[key] === 'number' ? options[key] : 0);
        }
        return sum;
      }, 0);
      extra = totalDishes * shoppingFeePerDish;
      console.log(`>> [HomeOrderStrategy] Extra shopping fee: ${extra} (Dishes: ${totalDishes}, Fee/Dish: ${shoppingFeePerDish})`);
    }
    return extra;
  }

  async afterCreate(orderId, data, connection) {
    const options = data.serviceOptions ? (typeof data.serviceOptions === 'string' ? JSON.parse(data.serviceOptions) : data.serviceOptions) : {};
    // 自动从 options 中提取菜品明细
    const dishDetails = data.dishDetails || {
      main: options['主菜'] || 0,
      side: options['副菜'] || 0,
      veg: options['素菜'] || 0,
      soup: options['汤类'] || 0
    };

    await connection.query(
      'INSERT INTO order_ext_home (order_id, dish_details, need_shopping, diners_count, flavor_prefs) VALUES (?, ?, ?, ?, ?)',
      [
        orderId,
        JSON.stringify(dishDetails),
        data.needShopping ? 1 : 0,
        data.dinersCount || options.dinersCount || 5,
        JSON.stringify(data.flavorPrefs || options.flavorPrefs || {})
      ]
    );
  }

  async extendDetail(order, connection) {
    const [ext] = await connection.query('SELECT * FROM order_ext_home WHERE order_id = ?', [order.id]);
    return { ...order, ...ext[0] };
  }

  /**
   * 更新额外资料
   */
  async updateExtra(orderId, params, connection) {
    const { groceryActualAmount, receiptImage, weighingVideo, groceryStatus } = params;
    const updateFields = [];
    const updateParams = [];
    if (groceryActualAmount !== undefined) { updateFields.push('grocery_actual_amount = ?'); updateParams.push(groceryActualAmount); }
    if (receiptImage !== undefined) { updateFields.push('receipt_image = ?'); updateParams.push(receiptImage); }
    if (weighingVideo !== undefined) { updateFields.push('weighing_video = ?'); updateParams.push(weighingVideo); }
    if (groceryStatus !== undefined) { updateFields.push('grocery_status = ?'); updateParams.push(groceryStatus); }
    if (updateFields.length > 0) {
      await connection.query(`UPDATE order_ext_home SET ${updateFields.join(', ')} WHERE order_id = ?`, [...updateParams, orderId]);
    }
  }
}

module.exports = new HomeOrderStrategy();
