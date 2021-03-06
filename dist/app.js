'use strict';

/*
 * 项目入口
 */
var os = require('os');
var path = require('path');
var assert = require('assert');
var express = require('express');
var debug = require('debug')('blog:server');
var supportsColor = require('supports-color');
var favicon = require('serve-favicon');
var morgan = require('morgan');
var rfs = require('rotating-file-stream');
// const vhost = require('vhost');
var http = require('http');
// https模块还是测试模块，所以在这里不使用
// const https = require('https');
//引入http2模块
var http2 = require('spdy');
var fs = require('fs');
// const oauth2server = require('oauth2-server');
var OAuthServer = require('express-oauth-server');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var webSocket = require('ws');
var MongoDBStore = require('connect-mongodb-session')(session);
var csurf = require('csurf');
var swig = require('swig');
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var bodyParser = require('body-parser');
var sillyDateTime = require('silly-datetime');
var serveIndex = require('serve-index');
var uuidv4 = require('uuid/v4');
var expressRequestId = require('express-request-id')();
var expressCurl = require('express-curl');
var app = express();

// const expressWS = require('express-ws')(app);
//是否启动记录访问日志
var start_log = true;
var options = {
    key: fs.readFileSync(path.join(__dirname + '/ssl/214483626110776.key')),
    cert: fs.readFileSync(path.join(__dirname + '/ssl/214483626110776.pem'))
};

//设置模板引擎
app.engine('swg', swig.renderFile);
//  设置模板路径
app.set('views', path.join(__dirname, '/app/views'));
// 注册模板
app.set('view engine', 'swg');
// 将模板缓存设置false
swig.setDefaults({ cache: false });
// 设置request id
app.use(expressRequestId);
// extends设置true表示接收的数据是数组，false表示是字符串
app.use(bodyParser.urlencoded({ extended: true }));
// 将提交的数据转成json,并且设置请求实体大小
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser('session_id', { maxAge: 1800000, secure: true }));
// app.use(expressCurl);

app.oauth = new OAuthServer({
    model: require(__dirname + '/app/models/Oauth_model'), // See below for specification
    grants: ['password', 'refresh_token'],
    debug: true,
    allowBearerTokensInQueryString: true,
    accessTokenLifetime: 4 * 60 * 60
    // accessTokenLifetime: Number,
    // refreshTokenLifetime: Number,
    // authCodeLifetime: Number,
    // clientIdRegex: regexp,
    // passthroughErrors: Boolean,
    // continueAfterResponse: Boolean

});

// app.use(app.oauth.authorize());

// app.use(function(req, res) {
//   res.send('Secret area');
// });

// const Request = oauth2server.Request;
// const Response = oauth2server.Response;
// app.use(app.oauth.authorize(Request,Response));
// app.use(function(req, res) {
//   res.send('Secret area');
// });

var store = new MongoDBStore({
    uri: 'mongodb://localhost:27017',
    databaseName: 'blog',
    collection: 'sessions'
}, function (err) {
    if (err) throw err;
});

store.on('error', function (error) {
    assert.ifError(error);
    assert.ok(false);
});

app.use(session({
    genid: function genid(req) {
        return uuidv4(); // use UUIDs for session IDs
    },
    secret: 'session_id', // 与cookieParser中的一致
    resave: true,
    store: store, // 将session保存到mongodb中
    saveUninitialized: true,
    cookie: {
        secure: true,
        maxAge: 1800000
    },
    rolling: true
}));
// 服务器启动时默认配置/动作
app.use(function (req, res, next) {
    // //将登录后的用户信息附加到request头信息中
    if (req.cookies.uid && req.cookies.uid != '') {
        try {
            req.session.uid = req.cookies.uid;
        } catch (e) {
            console.log(e);
        }
    }
    // 将系统类型添加到cookies和请求头中;
    // os.platform return now node runing systems : darwin=>MAC win32=>windows
    res.cookie('platform', os.platform);
    req.platform = os.platform;
    next();
});

app.use(csurf({ cookie: true, ignoreMethods: ['GET', 'POST'] }));
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    // handle CSRF token errors here
    res.status(403);
    res.send('form tampered with');
});

// 记录访问日志
if (start_log) {
    var logDirectory = path.join(__dirname, 'logs');
    fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory); // 日志目录不存在创建目录
    var logerFile = 'access_' + sillyDateTime.format(new Date(), 'YYYY_MMM_DD') + '.log';
    var accessLogStream = rfs(logerFile, {
        interval: '1d', // 日志切割间隔为1天，以s,m,h,d为单位
        path: logDirectory, // 日志保存路径，
        size: '1M', // 单个日志文件的大小，以B,K,M,G为单位
        compress: true // 压缩日志
    });
    app.use(morgan('combined', { stream: accessLogStream }));
}

// 添加一个虚拟机
// app.use(vhost('images.mcloudhub.com',(req,res,next)=>{
//     options = {
//         key: fs.readFileSync(__dirname+'/ssl/214517687450776.key'),
//         cert: fs.readFileSync(__dirname+'/ssl/214517687450776.pem')
//     };
//     app.use('/public', express.static(__dirname + '/public'));
//     next();
// }));

// 设置ftp路由
app.use('/ftp', express.static(path.join(__dirname, '/app/ftp')), serveIndex(path.join(__dirname, '/app/ftp'), { 'icons': true }));

// Listen
// app.listen(3000)
//设置响应头
// app.setHeader('content-type', 'text-css');
//设置静态文件托管
app.use('/public', express.static(path.join(__dirname, '/app/public')));
app.use('/download', express.static(path.join(__dirname, '/app/download')));
app.use(favicon(path.join(__dirname, 'app/public/images', 'favicon.ico')));
//  app.use();
// app.get('/', (req, res, next) => {
//     //  res.send('Hello Word')
//     res.render('index', );
// });
// app.use('/admin', require('./routers/admin'));

// 定义路由www
app.use('/api', require(path.join(__dirname, '/app/routers/api')));
app.use('/', require(path.join(__dirname, '/app/routers/main')));
app.use('/article', require(path.join(__dirname, '/app/routers/article')));
app.use('/setting', require(path.join(__dirname, '/app/routers/setting')));
app.use('/photos', require(path.join(__dirname, '/app/routers/photos')));
app.use('/resume', require(path.join(__dirname, '/app/routers/resume')));
app.use('/oauth', require(path.join(__dirname, '/app/routers/oauth')));
// app.all('/oauth/token', app.oauth.grant());

//设置响应头
//  app.setHeader('content-type','text-css');
//  app.set('*/css',(req,res,next)=>{
//      res.render('bbody{background:#FFF;}');
//  });

// 处理404请求

app.get('*', function (req, res) {
    res.render(path.join(__dirname, '/app/views/404'), {
        title: 'No Found'
    });
});

// 处理500请求

//连接数据库
mongoose.connect('mongodb://localhost:27017/blog', function (err, res) {
    if (err) {
        console.log(err);
    } else {
        // 数据库连接成功后监听80/443端口
        // app.listen(80);
        http.createServer(app).listen(80);
        // https.createServer(options, app).listen(443);
        var server = http2.createServer(options, app);
        var wss = new webSocket.Server({ server: server });

        if (supportsColor.stdout) {
            console.log('Terminal stdout supports color');
        }

        if (supportsColor.stderr.has16m) {
            console.log('Terminal stderr supports 16 million colors (truecolor)');
        }

        if (supportsColor.stdout.has256) {
            console.log('Terminal stdout supports 256 colors');
        }

        if (debug.enabled) {
            debug('server is `starting` listen `443` project `blog` run_model DEBUG');
        }

        // 返回进程环境信息
        // console.log(process.env);

        wss.on('connection', function connection(ws, req) {
            console.log(req);
            console.log(ws);
            // const location = url.parse(req.url, true);
            // You might use location.query.access_token to authenticate or share sessions
            // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

            ws.on('message', function incoming(message) {
                ws.send(message);
                console.log('received: %s', message);
            });

            ws.send('something');
        });
        server.listen(443);
    }
});
// app.listen(8080);

module.exports = app;
//# sourceMappingURL=app.js.map