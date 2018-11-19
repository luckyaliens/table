

var nebulas = require("nebulas"),
Account = nebulas.Account,
neb = new nebulas.Neb();
neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));
//neb.setRequest(new nebulas.HttpRequest("https://mainnet.nebulas.io"));

var NebPay = require("nebpay");
var nebPay = new NebPay();
var serialNumber;
var intervalQuery; //定时查询交易结果
//var callbackUrl = NebPay.config.mainnetUrl;
var callbackUrl = NebPay.config.testnetUrl;
var dappAddress='n1q6Kj3hoavidXxQPfdipypJsszSF9tBp6w';
//var dappAddress='n1yVhTWxtbansHCudqpNxEkHviVDLGUjbvA';
var myaccount;
var curMsgPage=1;
var clock;
var myCountDownNum=0
//查询信息
function Refresh(address,dappFun,args,fun){
	neb.api.call(address,dappAddress,"0","0","1000000","2000000",{"function": dappFun,"args": JSON.stringify(args)}).then(function (res) {
        //$.bootstrapLoading.end();
        if(res=='stream terminated by RST_STREAM with error code: REFUSED_STREAM'){
      	  //mui.toast('网络连接失败！');
            return;
        }
        if(res.result == '' && res.execute_err == 'contract check failed') {
      	  //mui.toast('合约检测失败，请检查浏览器钱包插件环境！');
            return;
        }
        var info = JSON.parse(res.result);
        if(fun){
        	fun(info);
    	}
    }).catch(function (err) {
        console.log("error:" + err.message);
        //$.bootstrapLoading.end();
    });
}
//刷新交易
function funcIntervalQuery(callbackfun) {   
    nebPay.queryPayInfo(serialNumber)  
        .then(function (resp) {
            var respObject = JSON.parse(resp)
            //code==0交易发送成功, status==1交易已被打包上链
            if(respObject.code === 0 && respObject.data.status === 1){                    
                //交易成功,处理后续任务....
                clearInterval(intervalQuery)    //清除定时查询
                //$.bootstrapLoading.end();
                if(callbackfun){
                	callbackfun();
                	Modal.alert({title:'Warning',isShowNasCount:false,msg:'Successful operation !'});
            	}
            }else if(respObject.code === 0 && respObject.data.status === 0){
            	clearInterval(intervalQuery)    //清除定时查询
            	switch (respObject.data.execute_result) {
				case 'Error: errorCode:1':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! Suspension service. '});
					break;
				case 'Error: errorCode:2':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! The table does not exist. '});
					break;
				case 'Error: errorCode:3':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! Incorrect amount. '});
					break;
				case 'Error: errorCode:4':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! The table does not belong to you. '});
					break;
				case 'Error: errorCode:5':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! The amount is below the minimum value. '});
					break;
				case 'Error: errorCode:6':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! The amount can not be zero. '});
					break;
				case 'Error: errorCode:7':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! The table has no owner, can not start the game. '});
					break;
				case 'Error: errorCode:8':
					Modal.alert({title:'Warning',isShowNasCount:false,msg:'Operation failed ! Victory type does not exist. '});
					break;
				}
            }
        })
        .catch(function (err) {
        	//$.bootstrapLoading.end();
        });
}
//倒计时
function myCountDown(){
	myCountDownNum++;
	clock.setValue(60-myCountDownNum);
	if(myCountDownNum>=60){
		loadData();
		myCountDownNum=0;
	}
}
//读取账号
function loadAccount(){
	nebPay.simulateCall(dappAddress, "0", "getAccount", "", {    
	      listener: function(cb){
	    	  if(cb=='error: please import wallet file'){
	    			serialNumber = nebPay.call(dappAddress, 0, "xxxxxxxx", "[]", {    //使用nebpay的call接口去调用合约,
	    	            listener: null        //设置listener, 处理交易返回信息
	    	        });
	    			return;
	    		}
	    	  myaccount = JSON.parse(cb.result);
	    	  $('#myaccount').html(myaccount);
	    	  loadData();
	      }
	   });
}
//加载消息
function loadMsg(num){
	curMsgPage+=num;
	if(curMsgPage<1){
		curMsgPage=1;
	}
	if(myaccount!=undefined&&myaccount.length>0){
		Refresh(myaccount,"getMsg",[myaccount,curMsgPage,10],function(data){
			$('#curMsgPage').html(curMsgPage);
			var tmpHtml='';
			for(var i=0;i<data.length;i++){
				var isFirst='';
				if(i==0&&curMsgPage==1){
					isFirst+='&nbsp;&nbsp;<span class="badge badge-info">New</span>';
				}
				var isborder='';
				if(i==data.length-1){
					isborder='style="border-bottom:none;"';
				}
				switch (data[i].type) {
				case 1://1买桌子 2卖桌子 3增加桌子价值 4减少桌子价值 5玩
					tmpHtml+='<p class="card-text" '+isborder+' >No.'+data[i].tableIndex+' table : Buy Table , Cost : '+data[i].money+' Nas , Date : '+new Date(data[i].updateDate).Format('yyyy-MM-dd hh:mm:ss')+isFirst+'</p>'
					break;
				case 2:
					tmpHtml+='<p class="card-text" '+isborder+' >No.'+data[i].tableIndex+' table : Be Bought , Price : '+data[i].money+' Nas , Poundage : '+data[i].poundage+' Nas , Date : '+new Date(data[i].updateDate).Format('yyyy-MM-dd hh:mm:ss')+isFirst+'</p>'
					break;
				case 3:
					tmpHtml+='<p class="card-text" '+isborder+' >No.'+data[i].tableIndex+' table : Add Cash , Cost : '+data[i].money+' Nas , Date : '+new Date(data[i].updateDate).Format('yyyy-MM-dd hh:mm:ss')+isFirst+'</p>'
					break;
				case 4:
					tmpHtml+='<p class="card-text" '+isborder+' >No.'+data[i].tableIndex+' table : Sub Cash , Cost : '+data[i].money+' Nas , Date : '+new Date(data[i].updateDate).Format('yyyy-MM-dd hh:mm:ss')+isFirst+'</p>'
					break;
				case 5:
					var isWin='&nbsp;&nbsp;<font size="3" color="red">Win&nbsp;</font>&nbsp;&nbsp;code='+returnGameType(data[i].gameType);
					var winStr=' Won : '+data[i].winMoney+' Nas  , Poundage : '+data[i].poundage+' Nas ,';
					if(data[i].winMoney==0){
						isWin='&nbsp;&nbsp;<font size="3" color="green">Lose</font>&nbsp;&nbsp;code='+returnGameType(data[i].gameType);
						winStr='';
					}
					tmpHtml+='<p class="card-text" '+isborder+' >'+'<img src="img/sz_0'+data[i].a1+'.png">&nbsp;&nbsp;<img src="img/sz_0'+data[i].a2+'.png">&nbsp;&nbsp;<img src="img/sz_0'+data[i].a3+'.png">'+isWin+'&nbsp;&nbsp;Cost='+data[i].money+' Nas<br/>No.'+data[i].tableIndex+' table : Play , '+winStr+' Date : '+new Date(data[i].updateDate).Format('yyyy-MM-dd hh:mm:ss')+isFirst+'</p>';  
					break;
				}
				
			}
			if(tmpHtml==''){
				tmpHtml='None';
			}
			$('#message').html(tmpHtml);
		});
	}
}
function returnGameType(type){
	if(type<10){
		return type+'&nbsp;&nbsp;&nbsp;&nbsp;';
	}else if (type<100){
		return type+'&nbsp;&nbsp;';
	}
	return type;
}
function returnTypeText(type){
	switch (type) {
	case 1:
		return "Small Number."
	case 2:
		return "Big Number."
	case 3:
		return "the three ones are the same."
	case 801:
		return '<img src="img/sz_01.png"></img><img src="img/sz_01.png"></img><img src="img/sz_01.png"></img> .';
	case 802:
		return '<img src="img/sz_02.png"></img><img src="img/sz_02.png"></img><img src="img/sz_02.png"></img> .';
	case 803:
		return '<img src="img/sz_03.png"></img><img src="img/sz_03.png"></img><img src="img/sz_03.png"></img> .';
	case 804:
		return '<img src="img/sz_04.png"></img><img src="img/sz_04.png"></img><img src="img/sz_04.png"></img> .';
	case 805:
		return '<img src="img/sz_05.png"></img><img src="img/sz_05.png"></img><img src="img/sz_05.png"></img> .';
	case 806:
		return '<img src="img/sz_06.png"></img><img src="img/sz_06.png"></img><img src="img/sz_06.png"></img> .';
	case 4:
		return "the sum of three numbers is 4."
	case 5:
		return "the sum of three numbers is 5."
	case 6:
		return "the sum of three numbers is 6."
	case 7:
		return "the sum of three numbers is 7."
	case 8:
		return "the sum of three numbers is 8."
	case 9:
		return "the sum of three numbers is 9."
	case 10:
		return "the sum of three numbers is 10."
	case 11:
		return "the sum of three numbers is 11."
	case 12:
		return "the sum of three numbers is 12."
	case 13:
		return "the sum of three numbers is 13."
	case 14:
		return "the sum of three numbers is 14."
	case 15:
		return "the sum of three numbers is 15."
	case 16:
		return "the sum of three numbers is 16."
	case 17:
		return "the sum of three numbers is 17."
	case 101:
		return 'will appear <img src="img/sz_01.png"> .';
	case 102:
		return 'will appear <img src="img/sz_02.png"> .';
	case 103:
		return 'will appear <img src="img/sz_03.png"> .';
	case 104:
		return 'will appear <img src="img/sz_04.png"> .';
	case 105:
		return 'will appear <img src="img/sz_05.png"> .';
	case 106:
		return 'will appear <img src="img/sz_06.png"> .';
	default:
		return "";
	}
}
Date.prototype.Format = function (fmt) { //author: meizz 
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
$(function () {
	  window.Modal = function () {
	    var reg = new RegExp("\\[([^\\[\\]]*?)\\]", 'igm');
	    var alr = $("#ycf-alert");
	    var ahtml = alr.html();

	    var _alert = function (options) {
	      alr.html(ahtml);    // 复原
	      alr.find('.ok').removeClass('btn-success').addClass('btn-primary');
	      alr.find('.cancel').hide();
	      _dialog(options);

	      return {
	        on: function (callback) {
	          if (callback && callback instanceof Function) {
	            alr.find('.ok').click(function () { callback(true) });
	          }
	        }
	      };
	    };

	    var _confirm = function (options) {
	      alr.html(ahtml); // 复原
	      alr.find('.ok').removeClass('btn-primary').addClass('btn-success');
	      alr.find('.cancel').show();
	      _dialog(options);

	      return {
	        on: function (callback) {
	          if (callback && callback instanceof Function) {
	            alr.find('.ok').click(function () { callback(true) });
	            alr.find('.cancel').click(function () { callback(false) });
	          }
	        }
	      };
	    };

	    var _dialog = function (options) {
	    	$("#nasCount").val('');
	    	if(options.isShowNasCount==false){
	    		$('#nasCountFrom').hide();
	    	}else{
	    		$('#nasCountFrom').show();	    		
	    	}
	      var ops = {
	        msg: "text",
	        title: "Warning",
	        btnok: "Ok",
	        btncl: "Cancel"
	      };

	      $.extend(ops, options);

	      console.log(alr);

	      var html = alr.html().replace(reg, function (node, key) {
	        return {
	          Title: ops.title,
	          Message: ops.msg,
	          BtnOk: ops.btnok,
	          BtnCancel: ops.btncl
	        }[key];
	      });
	      
	      alr.html(html);
	      alr.modal({
	        width: 500,
	        backdrop: 'static'
	      });
	    }

	    return {
	      alert: _alert,
	      confirm: _confirm
	    }

	  }();
	});