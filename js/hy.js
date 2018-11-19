'use strict';

//����ʵ��
var TableInfo=function (jsonStr){
	if (jsonStr) {
		var obj=JSON.parse(jsonStr);
		//����˭��
		this.ownerAddress=obj.ownerAddress;
		//�����ӵ�����Ǯ
		this.cash=obj.cash;
		//�����ӵڼ�����Ϸ
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
//��Ϣʵ��
var MsgInfo=function (jsonStr){
	if (jsonStr) {
		var obj=JSON.parse(jsonStr);
		//��������
		this.tableIndex=obj.tableIndex;
		//˭����
		this.fromAddress=obj.fromAddress;
		//�漰��˭
		this.toAddress=obj.toAddress;
		//��Ϣ����
		this.type=obj.type;//1������ 2������ 3�������Ӽ�ֵ 4�������Ӽ�ֵ 5��
		//���
		this.money=obj.money;
		//Ӯȡ
		this.winMoney=obj.winMoney;
		//������
		this.poundage=obj.poundage;
		//ʱ��
		this.updateDate=obj.updateDate;
		
		this.a1=obj.a1;
		this.a2=obj.a2;
		this.a3=obj.a3;
		//��ע����
		this.gameType=obj.gameType;
		//�Ƿ�ʧȥ����
		this.isOver=obj.isOver;
		
	}else{
		
	}
};
MsgInfo.prototype = {
	    toString: function() {
	        return JSON.stringify(this);
	    }
};
//��Լ
var LuckPlayContract=function(){
	LocalContractStorage.defineProperty(this,"adminAddress");//��������Ա�˻���ַ
	LocalContractStorage.defineProperty(this,"isStop");//�Ƿ�ֹͣ
	LocalContractStorage.defineProperty(this,"tableCount");//��������
	LocalContractStorage.defineProperty(this,"poundage");//������
	LocalContractStorage.defineProperty(this,"minValue");//�������ټ�ֵ
	LocalContractStorage.defineMapProperty(this,"tablePool",{//���ӳ�
		parse: function(jsonText) {
			return new TableInfo(jsonText);
		},
		stringify: function(obj) {
			return obj.toString();
		}
	});
	LocalContractStorage.defineMapProperty(this,"msgInfoPool",{//�û���Ϣ��
		parse: function(jsonText) {
			return jsonText;
		},
		stringify: function(obj) {
			return obj;
		}
	});
};
//��Լ
LuckPlayContract.prototype={
		//��ʼ��
		init:function(){
			this.adminAddress="n1GEWFypS3PMRcQ17LrXhKasysZCwpyPNmK";//����Ա��ַ
			this.isStop=false;//�Ƿ�ֹͣ
			this.tableCount=3;//��������
			this.poundage=3;//������3%
			this.minValue=0.001;//���ټ�ֵ1nas
			for (var i = 1; i <=this.tableCount; i++) {
				var table=new TableInfo();
				table.ownerAddress="";
				table.cash=this.minValue;
				table.curCount=0;
				table.playArr=[];
				this.tablePool.put(i,table);
			}
		},
		//��ȡ������Ϣ
		getTableArrInfo:function(){
			var res=[];
			for (var i = 1; i <=this.tableCount; i++) {
				var table=this.tablePool.get(i);
				table.playArr=[];
				res.push(table);		
			}
			return res;
		},
		//��ȡָ��������Ϣ
		getTableArrInfoByIndex:function(index){
			var table=this.tablePool.get(index);
			table.playArr=table.playArr.slice(0,99);
			return table;
		},
		//��ȡָ��������Ϣ
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
		//�������Ӽ�ֵ
		addCashToTable:function(tableIndex){
			if(this.isStop==true){
				throw new Error("errorCode:1");//��ͣ������.
			}
			var from = Blockchain.transaction.from;
			var value = Blockchain.transaction.value;
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//���Ӳ�����
			}
			if(table.ownerAddress!=from){
				throw new Error("errorCode:4");//���Ӳ�������
			}
			var curDate=new Date();
			table.cash=new BigNumber(table.cash).plus(new BigNumber(value).div(1000000000000000000));
			this.tablePool.put(tableIndex,table);
			
			//�������Ӽ�ֵ
			var msg=new MsgInfo();
			msg.updateDate=curDate;
			msg.tableIndex=tableIndex;
			msg.fromAddress=from;
			msg.type=3;
			msg.money=new BigNumber(value).div(1000000000000000000);
			this.msgInfoPool.put(from,this.addMsg(from,msg));
			this.msgInfoPool.put("sys",this.addMsg("sys",msg));
		},
		//�������Ӽ�ֵ
		subCashToTable:function(tableIndex,subCash){
			if(this.isStop==true){
				throw new Error("errorCode:1");//��ͣ������.
			}
			var from = Blockchain.transaction.from;
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//���Ӳ�����
			}
			if(table.ownerAddress!=from){
				throw new Error("errorCode:4");//���Ӳ�������
			}
			var tmpCash=new BigNumber(table.cash).minus(subCash);
			if(tmpCash<this.minValue){
				throw new Error("errorCode:5");//���Ӽ�ֵ��������1nas
			}
			var curDate=new Date();
			//ת�˸��Է�
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
			//�������Ӽ�ֵ
			var msg=new MsgInfo();
			msg.updateDate=curDate;
			msg.tableIndex=tableIndex;
			msg.fromAddress=from;
			msg.type=4;
			msg.money=subCash;
			this.msgInfoPool.put(from,this.addMsg(from,msg));
			this.msgInfoPool.put("sys",this.addMsg("sys",msg));
		},
		//������
		buyTable:function(tableIndex){
			if(this.isStop==true){
				throw new Error("errorCode:1");//��ͣ������.
			}
			var from = Blockchain.transaction.from;
			var value = Blockchain.transaction.value;
			
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//���Ӳ�����
			}
			var curDate=new Date();
			if(table.ownerAddress==""){
				if(!(new BigNumber(table.cash)).times(1000000000000000000).eq(value)){
					throw new Error("errorCode:3");//����ȷ
				}
			}else{
				if(!(new BigNumber(table.cash)).times(1000000000000000000).times(1.5).eq(value)){
					throw new Error("errorCode:3");//����ȷ
				}
				var sellerAddress=table.ownerAddress;
				//����۸�
				var allMoney=new BigNumber(value);
				//������
				var sxfPrice=new BigNumber((new BigNumber(value)).times((new BigNumber(this.poundage)).div(100)));
				//�������ӵ��˻�õ�
				var sellerMoney= allMoney.minus(sxfPrice);
				
				//������
				var msg=new MsgInfo();
				msg.updateDate=curDate;
				msg.tableIndex=tableIndex;
				msg.fromAddress=from;
				msg.type=2;
				msg.money=(new BigNumber(value)).div(1000000000000000000);
				msg.poundage=(new BigNumber(sxfPrice)).div(1000000000000000000);
				this.msgInfoPool.put(sellerAddress,this.addMsg(sellerAddress,msg));
				
				//ת�˸��Է�
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
	            //������ת��ָ���˻�
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
			//������
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
		//�����Ϣ
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
		//�����ַ���תΪ�������
		toArrJson:function(jsonStr){
			if (jsonStr) {
				return JSON.parse(jsonStr);
			}
			return [];
		},
		//��
		play:function(tableIndex,type){
			if(this.isStop==true){
				throw new Error("errorCode:1");//��ͣ������.
			}
			var a1= this.random(1,6);
			var a2= this.random(1,6);
			var a3= this.random(1,6);
			
			var from = Blockchain.transaction.from;
			var value = Blockchain.transaction.value;
			if(value <=0){
				throw new Error("errorCode:6");//�������Ϊ��
			}
			
			var table= this.tablePool.get(tableIndex);
			if(table==null){
				throw new Error("errorCode:2");//���Ӳ�����
			}
			if(table.ownerAddress==""){
				throw new Error("errorCode:7");//����û������,�޷�������Ϸ
			}
			var curDate=new Date();
			var msg=new MsgInfo();
			var winCount=this.isWin(type,a1,a2,a3);
			if(winCount==-1){
				throw new Error("errorCode:8");//ʤ�����Ͳ�����
			}
			var sxfPrice;
			var winPrice;
			if(winCount==0){
				//����
				sxfPrice=new BigNumber(new BigNumber(value).times(new BigNumber(this.poundage).div(100)));
				
				table.cash=new BigNumber(table.cash).plus(new BigNumber(value).minus(sxfPrice).div(1000000000000000000));
				msg.poundage=new BigNumber(sxfPrice).div(1000000000000000000);
				winPrice=0;
			}else{
				//Ӯ��
				
				var allWin=new BigNumber(value).times(winCount);
				if(table.cash>=allWin.div(1000000000000000000)){
					winPrice=allWin.div(1000000000000000000);
				}else{
					winPrice=table.cash;
				}
				table.cash= new BigNumber(table.cash).minus(winPrice) ;
				//�����ϱ�֤���
				if(table.cash<=0){
					table.ownerAddress="";
					table.cash=this.minValue;
					msg.isOver=true;
				}
				
				sxfPrice=new BigNumber(winPrice).times(1000000000000000000).times(this.poundage).div(100);
				msg.poundage=sxfPrice.div(1000000000000000000);
			}
			
			//������ת��ָ���˻�
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
            //���Ӯ��ת��ȥ
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
			
			//��Ϣ
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
		
		//�Ƿ�Ӯ��
		isWin:function(type,a1,a2,a3){
			var sum=a1+a2+a3;
			if(type==1){
				//��С
				if(a1==a2&&a2==a3){
					//����ͨɱ
					return 0;
				}
				if(sum>=4&&sum<=10){
					return 1;
				}
			}else if (type==2){
				//�´�
				if(a1==a2&&a2==a3){
					//����ͨɱ
					return 0;
				}
				if(sum>=11&&sum<=17){
					return 1;
				}
			}else if (type==3){
				//���ⱪ��
				if(a1==a2&&a2==a3){
					return 33;
				}
			}else if (type==801){
				//111����
				if(a1==a2&&a2==a3&&a1==1){
					return 200;
				}
			}else if (type==802){
				//222����
				if(a1==a2&&a2==a3&&a1==2){
					return 200;
				}
			}else if (type==803){
				//333����
				if(a1==a2&&a2==a3&&a1==3){
					return 200;
				}
			}else if (type==804){
				//444����
				if(a1==a2&&a2==a3&&a1==4){
					return 200;
				}
			}else if (type==805){
				//555����
				if(a1==a2&&a2==a3&&a1==5){
					return 200;
				}
			}else if (type==806){
				//666����
				if(a1==a2&&a2==a3&&a1==6){
					return 200;
				}
			}else if(type==4){
				//������
				if(sum==4){
					return 60;
				}
			}else if(type==5){
				//������
				if(sum==5){
					return 30;
				}
			}else if(type==6){
				//������
				if(sum==6){
					return 17;
				}
			}else if(type==7){
				//������
				if(sum==7){
					return 12;
				}
			}else if(type==8){
				//������
				if(sum==8){
					return 8;
				}
			}else if(type==9){
				//������
				if(sum==9){
					return 6;
				}
			}else if(type==10){
				//������
				if(sum==10){
					return 6;
				}
			}else if(type==11){
				//������
				if(sum==11){
					return 6;
				}
			}else if(type==12){
				//������
				if(sum==12){
					return 6;
				}
			}else if(type==13){
				//������
				if(sum==13){
					return 8;
				}
			}else if(type==14){
				//������
				if(sum==14){
					return 12;
				}
			}else if(type==15){
				//������
				if(sum==15){
					return 17;
				}
			}else if(type==16){
				//������
				if(sum==16){
					return 30;
				}
			}else if(type==17){
				//������
				if(sum==17){
					return 60;
				}
			}else if(type==101){
				//��������win
				return this.haveCountWin(1,a1,a2,a3);
			}else if(type==102){
				//��������win
				return this.haveCountWin(2,a1,a2,a3);
			}else if(type==103){
				//��������win
				return this.haveCountWin(3,a1,a2,a3);
			}else if(type==104){
				//��������win
				return this.haveCountWin(4,a1,a2,a3);
			}else if(type==105){
				//��������win
				return this.haveCountWin(5,a1,a2,a3);
			}else if(type==106){
				//��������win
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
		//����һ�������
		random:function(lower, upper) {
			return Math.floor(Math.random() * (upper - lower+1)) + lower;
		},
		//��ȡ�˻�
		getAccount:function(){
			return Blockchain.transaction.from;
		},
		//�Ƿ��ǹ���Ա�˻�
		isAdmin:function(address){
			if (address != this.adminAddress) {
	            return false;
	        }
			return true;
		},
		//�������ϵ�����˸�����
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
		//������ͣ
		doStop:function(){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			this.isStop=true;
		},
		//�ָ���ʼ
		doPlay:function(){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			this.isStop=false;
		},
		//����������
		setPoundage:function(poundage){
			var from = Blockchain.transaction.from;
	        
			if(!this.isAdmin(from)){
				throw new Error("Permission denied.");
			}
			this.poundage=poundage;
		}
		
		
};

module.exports = LuckPlayContract;