<template>
  <div class="category-page">
    <van-nav-bar title="分类统计" fixed placeholder />
    <div class="content">
      <van-empty description="服务者端暂无分类浏览功能，请在首页查看订单" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'Category'
}
</script>

<style scoped>
.category-page { min-height: 100vh; background: #f7f8fa; }
</style>
