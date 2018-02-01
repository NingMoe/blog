const mongoose = require('mongoose');
//定义表结构，创建一个schema模型
module.exports = new mongoose.Schema({
    name: String, //定义用户名集合字段
    password: String, //定义用户密码集合字段
    salt: String, //定义验证值集合字段
    sex: Number, //定义用户性别集合字段
    age: Number, //定义用户头像集合字段,
    nick: String, //昵称
    qq: String, //qq
    phone: String, //手机
    wechat: String, //微信
    avatar: String, //头像
    signature: String, //签名
    email: String, //邮箱
    add_date: Date,
    isDel: Number,
});