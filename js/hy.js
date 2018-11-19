'use strict';

//桌子实体
var TableInfo=function (jsonStr){
	if (jsonStr) {
		var obj=JSON.parse(jsonStr);
		//属于谁的
		this.ownerAddress=obj.ownerAddress;
		//该桌子的所有钱
		this.cash=obj.cash;
		//该桌子第几次游戏
		this.curCount=obj.curCount;
		
		this.playArr=obj.playArr;
	}else{
	}
};
TableInfo.prototype = {
	    toString: function() {
	        return JSON.stringify(this);
	    }
};
//消息实体
var MsgInfo=function (jsonStr){
	if (jsonStr) {
		var obj=JSON.parse(jsonStr);
		//桌子索引
		this.tableIndex=obj.tableIndex;
		//谁触发
		this.fromAddress=obj.fromAddress;
		//涉及到谁
		this.toAddress=obj.toAddress;
		//消息类型
		this.type=obj.type;//1买桌子 2卖桌子 3增加桌子价值 4减少桌子价值 5玩
		//金额
		this.money=obj.money;
		//赢取
		this.winMoney=obj.winMoney;
		//手续费
		this.poundage=obj.poundage;
		//时间
		this.updateDate=obj.updateDate;
		
		this.a1=obj.a1;
		this.a2=obj.a2;
		this.a3=obj.a3;
		//下注类型
		this.gameType=obj.gameType;
		//是否失去桌子
		this.isOver=obj.isOver;
		
	}else{
		
	}
};
MsgInfo.prototype = {
	    toString: function() {
	        return JSON.stringify(this);
	    }
};
//合约
var LuckPlayContract=function(){
	LocalContractStorage.defineProperty(this,"adminAddress");//超级管理员账户地址
	LocalContractStorage.defineProperty(this,"isStop");//是否停止
	LocalContractStorage.defineProperty(this,"tableCount");//桌子数量
	LocalContractStorage.defineProperty(this,"poundage");//手续费
	LocalContractStorage.defineProperty(this,"minValue");//桌子最少价值
	LocalContractStorage.defineMapProperty(this,"tablePool",{//桌子池
		parse: function(jsonText) {
			return new TableInfo(jsonText);
		},
		stringify: function(obj) {
			return obj.toString();
		}
	});
	LocalContractStorage.defineMapProperty(this,"msgInfoPool",{//用户消息池
		parse: function(jsonText) {
			return jsonText;
		},
		stringify: function(obj) {
			return obj;
		}
	});
};
//合约
LuckPlayContract.prototype={
		//初始化
		init:function(){
			this.adminAddress="n1GEWFypS3PMRcQ17LrXhKasysZCwpyPNmK";//管理员地址
			this.isStop=false;//是否停止
			this.tableCount=3;//三张桌子
			this.poundage=3;//手续费3%
			this.minValue=0.001;//最少价值1nas
			for (var i = 1; i <=this.tableCount; i++) {
				var table=new TableInfo();
				table.ownerAddress="";
				table.cash=this.minValue;
				table.curCount=0;
				table.playArr=[];
				this.tablePool.put(i,table);
			}
		},
		//获取桌子消息
		getTableArrInfo:function(){
			var res=[];
			for (var i = 1; i <=this.tableCount; i++) {
				var table=this.tablePool.get(i);
				table.playArr=[];
				res.push(table);		
			}
			return res;
		},
		//获取指定桌子消息
		getTableArrInfoByIndex:function(index){
			var table=this.tablePool.get(index);
			table.playArr=table.playArr.slice(0,99);
			return table;
		},
		//获取指定条数消息
		getMsg:function(from,page,pageSize){
			var msgInfoStr=this.msgInfoPool.get(from);
			var msgInfo=this.toArrJson(msgInfoStr);
			if(msgInfo.length>0){
				var data=[];
				if(page==-1){
					for (var i=0; i<msgInfo.length; i++) {
						data.push(msgInfo[i]);						
					}
				}else{
					for (var i=(page-1)*pageSize; i<page*pageSize; i++) {
						if(i<msgInfo.length){
							data.push(msgInfo[i]);						
						}
					}
				}
				return data;
			}
			return [];
		},
		//增加桌子价值
		addCashToTable:function(tableIndex){
			if(this.isStop==true){
				throw new Error("errorCode:1");//暂停服务中.
			}
			var from = Blockchain.transaction.from;
			var value = Blockchain.transaction.value;
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//桌子不存在
			}
			if(table.ownerAddress!=from){
				throw new Error("errorCode:4");//桌子不属于您
			}
			var curDate=new Date();
			table.cash=new BigNumber(table.cash).plus(new BigNumber(value).div(1000000000000000000));
			this.tablePool.put(tableIndex,table);
			
			//增加桌子价值
			var msg=new MsgInfo();
			msg.updateDate=curDate;
			msg.tableIndex=tableIndex;
			msg.fromAddress=from;
			msg.type=3;
			msg.money=new BigNumber(value).div(1000000000000000000);
			this.msgInfoPool.put(from,this.addMsg(from,msg));
			this.msgInfoPool.put("sys",this.addMsg("sys",msg));
		},
		//减少桌子价值
		subCashToTable:function(tableIndex,subCash){
			if(this.isStop==true){
				throw new Error("errorCode:1");//暂停服务中.
			}
			var from = Blockchain.transaction.from;
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//桌子不存在
			}
			if(table.ownerAddress!=from){
				throw new Error("errorCode:4");//桌子不属于您
			}
			var tmpCash=new BigNumber(table.cash).minus(subCash);
			if(tmpCash<this.minValue){
				throw new Error("errorCode:5");//桌子价值不能少于1nas
			}
			var curDate=new Date();
			//转账给对方
			var sellerAddress=from;
			var sellerMoney=new BigNumber(subCash).times(1000000000000000000);
			var result = Blockchain.transfer(sellerAddress, sellerMoney); 
            if (!result) {
                Event.Trigger("sendMoney", {
                    Transfer: {
                        from: Blockchain.transaction.to,
                        to: sellerAddress,
                        value: sellerMoney
                    }
                });

                throw new Error("Award transfer failed. sendMoney Address:" + sellerAddress + ", NAS:" +(new BigNumber(sellerMoney).div(1000000000000000000)));
            }
            Event.Trigger("sendMoney", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: sellerAddress,
                    value: ( sellerMoney)
                }
            });
			table.cash=tmpCash;
			this.tablePool.put(tableIndex,table);
			//减少桌子价值
			var msg=new MsgInfo();
			msg.updateDate=curDate;
			msg.tableIndex=tableIndex;
			msg.fromAddress=from;
			msg.type=4;
			msg.money=subCash;
			this.msgInfoPool.put(from,this.addMsg(from,msg));
			this.msgInfoPool.put("sys",this.addMsg("sys",msg));
		},
		//买桌子
		buyTable:function(tableIndex){
			if(this.isStop==true){
				throw new Error("errorCode:1");//暂停服务中.
			}
			var from = Blockchain.transaction.from;
			var value = Blockchain.transaction.value;
			
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//桌子不存在
			}
			var curDate=new Date();
			if(table.ownerAddress==""){
				if(!(new BigNumber(table.cash)).times(1000000000000000000).eq(value)){
					throw new Error("errorCode:3");//金额不正确
				}
			}else{
				if(!(new BigNumber(table.cash)).times(1000000000000000000).times(1.5).eq(value)){
					throw new Error("errorCode:3");//金额不正确
				}
				var sellerAddress=table.ownerAddress;
				//买入价格
				var allMoney=new BigNumber(value);
				//手续费
				var sxfPrice=new BigNumber((new BigNumber(value)).times((new BigNumber(this.poundage)).div(100)));
				//卖出桌子的人获得的
				var sellerMoney= allMoney.minus(sxfPrice);
				
				//卖桌子
				var msg=new MsgInfo();
				msg.updateDate=curDate;
				msg.tableIndex=tableIndex;
				msg.fromAddress=from;
				msg.type=2;
				msg.money=(new BigNumber(value)).div(1000000000000000000);
				msg.poundage=(new BigNumber(sxfPrice)).div(1000000000000000000);
				this.msgInfoPool.put(sellerAddress,this.addMsg(sellerAddress,msg));
				
				//转账给对方
				var result = Blockchain.transfer(sellerAddress, sellerMoney); 
	            if (!result) {
	                Event.Trigger("sendMoney", {
	                    Transfer: {
	                        from: Blockchain.transaction.to,
	                        to: sellerAddress,
	                        value: sellerMoney
	                    }
	                });

	                throw new Error("Award transfer failed. sendMoney Address:" + sellerAddress + ", NAS:" +( (new BigNumber(sellerMoney)).div(1000000000000000000)));
	            }
	            Event.Trigger("sendMoney", {
	                Transfer: {
	                    from: Blockchain.transaction.to,
	                    to: sellerAddress,
	                    value: ( sellerMoney)
	                }
	            });
	            //手续费转到指定账户
	            result = Blockchain.transfer(this.adminAddress, sxfPrice); 
	            if (!result) {
	                Event.Trigger("sendMoney", {
	                    Transfer: {
	                        from: Blockchain.transaction.to,
	                        to: this.adminAddress,
	                        value: sxfPrice
	                    }
	                });

	                throw new Error("Award transfer failed. sendMoney Address:" + this.adminAddress + ", NAS:" +( (new BigNumber(sxfPrice)).div(1000000000000000000)));
	            }
	            Event.Trigger("sendMoney", {
	                Transfer: {
	                    from: Blockchain.transaction.to,
	                    to: this.adminAddress,
	                    value: ( sxfPrice)
	                }
	            });
			}
			//买桌子
			var msg=new MsgInfo();
			msg.updateDate=curDate;
			msg.tableIndex=tableIndex;
			msg.fromAddress=from;
			msg.type=1;
			msg.money= (new BigNumber(value)).div(1000000000000000000);
			this.msgInfoPool.put(from,this.addMsg(from,msg));
			this.msgInfoPool.put("sys",this.addMsg("sys",msg));
			
			table.ownerAddress=from;
			this.tablePool.put(tableIndex,table);
		},
		//添加消息
		addMsg:function(address,msg){
			var msgInfo=this.msgInfoPool.get(address);
			var tmpArr=[];
			if(msgInfo==null){
				tmpArr=[];
			}else{
				tmpArr=this.toArrJson(msgInfo);
			}
			tmpArr.unshift(msg);
			return JSON.stringify(tmpArr);
		},
		//数组字符串转为数组对象
		toArrJson:function(jsonStr){
			if (jsonStr) {
				return JSON.parse(jsonStr);
			}
			return [];
		},
		//玩
		play:function(tableIndex,type){
			if(this.isStop==true){
				throw new Error("errorCode:1");//暂停服务中.
			}
			var a1= this.random(1,6);
			var a2= this.random(1,6);
			var a3= this.random(1,6);
			
			var from = Blockchain.transaction.from;
			var value = Blockchain.transaction.value;
			if(value <=0){
				throw new Error("errorCode:6");//参与金额不能为零
			}
			
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//桌子不存在
			}
			if(table.ownerAddress==""){
				throw new Error("errorCode:7");//桌子没有主人,无法参与游戏
			}
			var curDate=new Date();
			var msg=new MsgInfo();
			var winCount=this.isWin(type,a1,a2,a3);
			if(winCount==-1){
				throw new Error("errorCode:8");//胜利类型不存在
			}
			var sxfPrice;
			var winPrice;
			if(winCount==0){
				//输了
				sxfPrice=new BigNumber(new BigNumber(value).times(new BigNumber(this.poundage).div(100)));
				
				table.cash=new BigNumber(table.cash).plus(new BigNumber(value).minus(sxfPrice).div(1000000000000000000));
				msg.poundage=new BigNumber(sxfPrice).div(1000000000000000000);
				winPrice=0;
			}else{
				//赢了
				
				var allWin=new BigNumber(value).times(winCount);
				if(table.cash>=allWin.div(1000000000000000000)){
					winPrice=allWin.div(1000000000000000000);
				}else{
					winPrice=table.cash;
				}
				table.cash= new BigNumber(table.cash).minus(winPrice) ;
				//桌子上保证金光
				if(table.cash<=0){
					table.ownerAddress="";
					table.cash=this.minValue;
					msg.isOver=true;
				}
				
				sxfPrice=new BigNumber(winPrice).times(1000000000000000000).times(this.poundage).div(100);
				msg.poundage=sxfPrice.div(1000000000000000000);
			}
			
			//手续费转到指定账户
            var result = Blockchain.transfer(this.adminAddress, sxfPrice); 
            if (!result) {
                Event.Trigger("sendMoney", {
                    Transfer: {
                        from: Blockchain.transaction.to,
                        to: this.adminAddress,
                        value: sxfPrice
                    }
                });

                throw new Error("Award transfer failed. sendMoney Address:" + this.adminAddress + ", NAS:" +( sxfPrice.div(1000000000000000000)));
            }
            Event.Trigger("sendMoney", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: this.adminAddress,
                    value: ( sxfPrice)
                }
            });
            //如果赢了转过去
			if(winPrice>0){
				var sellerAddress=from;
				
				var sellerMoney=new BigNumber(value).plus(new BigNumber(winPrice).times(1000000000000000000)).minus(sxfPrice);
				var result = Blockchain.transfer(sellerAddress, sellerMoney); 
	            if (!result) {
	                Event.Trigger("sendMoney", {
	                    Transfer: {
	                        from: Blockchain.transaction.to,
	                        to: sellerAddress,
	                        value: sellerMoney
	                    }
	                });

	                throw new Error("Award transfer failed. sendMoney Address:" + sellerAddress + ", NAS:" +( sellerMoney.div(1000000000000000000)));
	            }
	            Event.Trigger("sendMoney", {
	                Transfer: {
	                    from: Blockchain.transaction.to,
	                    to: sellerAddress,
	                    value: ( sellerMoney)
	                }
	            });
			}
			table.curCount=table.curCount+1;
			
			//消息
			msg.winMoney=winPrice;
			msg.updateDate=curDate;
			msg.tableIndex=tableIndex;
			msg.fromAddress=from;
			msg.toAddress=table.ownerAddress;
			msg.type=5;
			msg.money=new BigNumber(value).div(1000000000000000000);
			msg.a1=a1;
			msg.a2=a2;
			msg.a3=a3;
			msg.gameType=type;
			this.msgInfoPool.put(from,this.addMsg(from,msg));
			this.msgInfoPool.put(table.ownerAddress,this.addMsg(table.ownerAddress,msg));
			this.msgInfoPool.put("sys",this.addMsg("sys",msg));
			
			table.playArr.unshift(msg);
			this.tablePool.put(tableIndex,table);
		},
		
		//是否赢了
		isWin:function(type,a1,a2,a3){
			var sum=a1+a2+a3;
			if(type==1){
				//猜小
				if(a1==a2&&a2==a3){
					//豹子通杀
					return 0;
				}
				if(sum>=4&&sum<=10){
					return 1;
				}
			}else if (type==2){
				//猜大
				if(a1==a2&&a2==a3){
					//豹子通杀
					return 0;
				}
				if(sum>=11&&sum<=17){
					return 1;
				}
			}else if (type==3){
				//任意豹子
				if(a1==a2&&a2==a3){
					return 33;
				}
			}else if (type==801){
				//111豹子
				if(a1==a2&&a2==a3&&a1==1){
					return 200;
				}
			}else if (type==802){
				//222豹子
				if(a1==a2&&a2==a3&&a1==2){
					return 200;
				}
			}else if (type==803){
				//333豹子
				if(a1==a2&&a2==a3&&a1==3){
					return 200;
				}
			}else if (type==804){
				//444豹子
				if(a1==a2&&a2==a3&&a1==4){
					return 200;
				}
			}else if (type==805){
				//555豹子
				if(a1==a2&&a2==a3&&a1==5){
					return 200;
				}
			}else if (type==806){
				//666豹子
				if(a1==a2&&a2==a3&&a1==6){
					return 200;
				}
			}else if(type==4){
				//点数和
				if(sum==4){
					return 60;
				}
			}else if(type==5){
				//点数和
				if(sum==5){
					return 30;
				}
			}else if(type==6){
				//点数和
				if(sum==6){
					return 17;
				}
			}else if(type==7){
				//点数和
				if(sum==7){
					return 12;
				}
			}else if(type==8){
				//点数和
				if(sum==8){
					return 8;
				}
			}else if(type==9){
				//点数和
				if(sum==9){
					return 6;
				}
			}else if(type==10){
				//点数和
				if(sum==10){
					return 6;
				}
			}else if(type==11){
				//点数和
				if(sum==11){
					return 6;
				}
			}else if(type==12){
				//点数和
				if(sum==12){
					return 6;
				}
			}else if(type==13){
				//点数和
				if(sum==13){
					return 8;
				}
			}else if(type==14){
				//点数和
				if(sum==14){
					return 12;
				}
			}else if(type==15){
				//点数和
				if(sum==15){
					return 17;
				}
			}else if(type==16){
				//点数和
				if(sum==16){
					return 30;
				}
			}else if(type==17){
				//点数和
				if(sum==17){
					return 60;
				}
			}else if(type==101){
				//包含几个win
				return this.haveCountWin(1,a1,a2,a3);
			}else if(type==102){
				//包含几个win
				return this.haveCountWin(2,a1,a2,a3);
			}else if(type==103){
				//包含几个win
				return this.haveCountWin(3,a1,a2,a3);
			}else if(type==104){
				//包含几个win
				return this.haveCountWin(4,a1,a2,a3);
			}else if(type==105){
				//包含几个win
				return this.haveCountWin(5,a1,a2,a3);
			}else if(type==106){
				//包含几个win
				return this.haveCountWin(6,a1,a2,a3);
			}else{
				return -1;
			}
			return 0;
		},
		haveCountWin:function(win,a1,a2,a3){
			var count=0;
			if(a1==win){
				count++;
			}
			if(a2==win){
				count++;
			}
			if(a3==win){
				count++;
			}
			if(count==3){
				return 6;
			}else if(count==2){
				return 2;
			}else if(count==1){
				return 1;
			}
			return 0;
		},
		//生成一个随机数
		random:function(lower, upper) {
			return Math.floor(Math.random() * (upper - lower+1)) + lower;
		},
		//获取账户
		getAccount:function(){
			return Blockchain.transaction.from;
		},
		//是否是管理员账户
		isAdmin:function(address){
			if (address != this.adminAddress) {
	            return false;
	        }
			return true;
		},
		//把桌子上的余额退给桌主
		returnCash:function(){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			
			for (var i = 1; i <=this.tableCount; i++) {
				var table=this.tablePool.get(i);
				if(table.ownerAddress!=undefined&&table.ownerAddress!=''&&table.cash>0){
					var sellerAddress=table.ownerAddress;
					
					var sellerMoney=new BigNumber(table.cash).times(1000000000000000000);
					var result = Blockchain.transfer(sellerAddress, sellerMoney); 
		            if (!result) {
		                Event.Trigger("sendMoney", {
		                    Transfer: {
		                        from: Blockchain.transaction.to,
		                        to: sellerAddress,
		                        value: sellerMoney
		                    }
		                });

		                throw new Error("Award transfer failed. sendMoney Address:" + sellerAddress + ", NAS:" +( sellerMoney.div(1000000000000000000)));
		            }
		            Event.Trigger("sendMoney", {
		                Transfer: {
		                    from: Blockchain.transaction.to,
		                    to: sellerAddress,
		                    value: ( sellerMoney)
		                }
		            });
		            table.ownerAddress="";
		            table.cash=this.minValue;
		            this.tablePool.put(i,table);
				}
			}
		},
		//紧急暂停
		doStop:function(){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			this.isStop=true;
		},
		//恢复开始
		doPlay:function(){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			this.isStop=false;
		},
		//设置手续费
		setPoundage:function(poundage){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			this.poundage=poundage;
		}
		
		
};

module.exports = LuckPlayContract;