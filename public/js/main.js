const vm = new Vue({
    delimiters: ['${', '}'],
    el: '#app',
    data: {
        token:'',
        name:'',
        password:'',
        remember:true,
        slide_list:{},
        tags_list:{},
        slideAttr:{
            timer:null,
            left:0,
            length:0,
            value:1024,
            index:0,
            cursor:null
        },
        accountSymbol:'&#xe68f;',
        accountBox:'none'
    },
    methods:{
        init:function(){
            this.getTags();
            this.getToken();
            this.getSlides();
            this.slideAutoPlay();
        },
        switchSlide:function(e,direction){
            if(direction == 'next'){
                this.slideAttr.index--;
                if(this.slideAttr.index <= -this.slideAttr.length){
                    this.slideAttr.index = 0;
                }
            }else{
                this.slideAttr.index++;
                if(this.slideAttr.index >= 0){
                    this.slideAttr.index = -this.slideAttr.length+1;
                }
            }
            this.slidePlay(this.slideAttr.index);
        },
        slidePlay:function(index){
            this.slideAttr.left = index*this.slideAttr.value;
        },
        slideAutoPlay:function(){
            let _this = this;
            this.slideAttr.timer = setInterval(function(){
                _this.switchSlide(null,'next');
            },1000);
        },
        stopSlidePlay:function(){
            this.slideAttr.cursor = 'pointer';
            clearInterval(this.slideAttr.timer);
        },
        autoSlidePlay:function(){
            this.slideAttr.cursor = null;
            this.slideAutoPlay();
        },
        submitForm:function(e,type){
            this.$http.post('/api/signin',{name:this.name,password:this.password,token:this.token,form:'index',remember:this.remember}).then((res)=>{
                if(!res) throw console.log(res);
                if(res.body.code == 0 && res.body.ok == false){
                    window.location = '/register';
                }else{
                    console.log(res);
                }
            });
        },
        getToken:function(){
            if(!this.token || this.token == ''){
                this.$http.get('/api/gettoken').then((res)=>{
                    if(!res) throw console.log(err);
                    this.token = res.body.data.token;
                })
            }
        },
        getTags:function(){
            this.$http.get('/api/tags').then(res=>{
                this.tags_list = res.body.data;
            });
        },
        getSlides:function(){
            this.$http.get('/api/slides').then(res=>{
                this.slide_list = res.body.data;
                this.slideAttr.length = res.body.data.length;
            });
        },
        showAccountBox:function(){
            if(this.accountBox == 'none'){
                this.accountBox = 'block';
                this.accountSymbol = '&#xe68d';
            }else{
                this.accountBox = 'none';
                this.accountSymbol = '&#xe68f;'
            }
        }
    }
});
vm.init();
// vm.html2markdown();