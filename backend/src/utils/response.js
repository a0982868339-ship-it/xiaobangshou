const sendSuccess = (res, data = null, message = '操作成功', code = 200) => {
  res.status(code).json({
    code,
    success: true,
    message,
    data,
    timestamp: Date.now()
  });
};

const sendError = (res, message = '操作失败', code = 400, errors = null) => {
  res.status(code).json({
    code,
    success: false,
    message,
    errors,
    timestamp: Date.now()
  });
};

const sendPage = (res, data = [], total = 0, page = 1, pageSize = 10) => {
  res.status(200).json({
    code: 200,
    success: true,
    message: '查询成功',
    data: {
      list: data,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    },
    timestamp: Date.now()
  });
};

module.exports = { sendSuccess, sendError, sendPage };
