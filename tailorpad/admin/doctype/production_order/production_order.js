// Copyright (c) 2021, White Hat Global and contributors
// For license information, please see license.txt

frappe.ui.form.on('Production Order', {
	refresh: function(frm) {
		cur_frm.fields_dict['production_order_table'].grid.wrapper.find('.grid-remove-rows').hide();
		cur_frm.fields_dict['production_order_table'].grid.wrapper.find('.grid-add-row').hide();
		cur_frm.fields_dict['job_card'].grid.wrapper.find('.grid-remove-rows').hide();
		cur_frm.fields_dict['job_card'].grid.wrapper.find('.grid-add-row').hide();
		
		var count = 0;
		for (var i = 0; i < frm.doc.production_order_table.length; i++){
			if (frm.doc.production_order_table[i].get_operation==1) {
					 count++;
			}
		}
		var opn_tot = count;
		console.log(opn_tot);
		console.log('len '+frm.doc.production_order_table.length);
		//if(opn_tot > '1'){
		//	frappe.throw('Only one operations can get at a time.')
		//}

			frm.add_custom_button(__('Issue Raw Material'), 
			function(){
				for(var i=0; i<frm.doc.job_card.length; i++){
				frappe.call({
					method: "tailorpad.admin.doctype.production_order.production_order.get_users_wo_operation_data",
					freeze: true,
					args: {
						'production_order': frm.doc.name,
						'item_code': frm.doc.job_card[i].item_name
					},
					callback: function(r) {
						var dialog = new frappe.ui.Dialog({
						title: __("For Operation"),
						fields: [
							{"fieldtype": "Link", "label": __("Operation"), "fieldname": "operation", "options":"Operation",
								"get_query": function () {
									return {
										filters: [
											['Operation', 'name', 'in', r.message]
										]
									}
								} },
								{"fieldtype": "Button", "label": __("Issue Raw Material"), "fieldname": "issue_raw_material", "cssClass": "btn-primary"},
							]
						});
		
						dialog.fields_dict.issue_raw_material.$input.click(function() {
							var args = dialog.get_values();
							if(!args) return;
							dialog.hide();
							for(var n=0; n<frm.doc.job_card.length; n++){
								return frappe.call({
									type: "GET",
									method: "tailorpad.custom_folder.custom_manufacturing.issue_raw_material",
									args: {
										"work_order": frm.doc.job_card[n].work_order,
										"operation": args.operation
									},
									freeze: true,
									callback: function(r) {
										if(!r.exc) {
											var doc = frappe.model.sync(r.message);
											frappe.set_route("Form", r.message.doctype, r.message.name);
										}
									}
								})
							}
						});
						dialog.show();
				}
				
			})
		}
		});
	},
	after_save: function(frm){
		for (var c=0; c<frm.doc.job_card.length; c++){
			console.log('REF')
			if (!frm.doc.job_card[c].to_time){
				if(frm.doc.job_card[c].completed && frm.doc.job_card[c].completed_qty == frm.doc.job_card[c].assigned_qty && frm.doc.job_card[c].balance_qty == '0'){
					console.log(' RED THIRD'+frm.doc.job_card[c].balance_qty)
					frappe.call({
						method: 'tailorpad.admin.doctype.production_order.production_order.update_jc',
						args: {
							'docid': frm.doc.name,
							'row': frm.doc.job_card[c].name,
							'comp': frm.doc.job_card[c].assigned_qty,
							'ws': frm.doc.job_card[c].workstation
						},
						callback: function(r) {
							//cur_frm.reload_doc();
							console.log('msg be')
							console.log(r.message)
							var d = r.message;
							d.forEach( function(row,v) {
								console.log(row);
								var child = frm.doc.job_card;
								console.log(d[2])
								child.forEach(function(e) {
									if(e.name == d[0]){
										console.log('in '+e.name)
										e.to_time = d[1];
									}
								})
							})
						}
					});
				}
			}
		}

		//var count = 0;
		//for (var i = 0; i < frm.doc.job_card.length; i++){
		//	if (frm.doc.job_card[i].completed==1) {
		//		count++;
		//	}
		//}
		//var total = count;
		//console.log('nive '+total);
		//if (total != '0') {
		//	console.log('total '+total);
		//	if (total == frm.doc.job_card.length){
		//		frappe.call({
		//			method: "tailorpad.admin.doctype.production_order.production_order.gen_ser_no",
		//			args: { "docid": frm.doc.name,
		//			},
		//			callback: function(r){
						//cur_frm.refresh_fields();
		//				cur_frm.reload_doc();
					//console.log('ruom '+r.message);
					//cur_frm.set_value('serial_no',r.message);
					/*var msg = [];
					msg.push(r.message);
					for (var j in msg){
						if(frm.doc.serial_no){
							frm.doc.serial_no += j + "\n";
						}
						else{
							frm.doc.serial_no = r.message;
						}
					}*/
					/*cur_frm.set_value('serial_no',r.message);
					frm.data = [];
					const dialog = new frappe.ui.Dialog({
					title: __("Select Serial No completed from Generated Serial No"),
					fields: [
						{
							fieldtype:'Small Text',
							fieldname:"gen_ser_no",
							default: r.message,
							readonly: '1',
							label: __('Generated Serial Numbers'),
						},
						{       
							fieldtype:'Check',
							fieldname:"ser_no",
							reqd: "1" ,
							label: __('Serial No completed'),
						}
					],
					primary_action: function() {
						frappe.call({
							method: 'tailorpad.admin.doctype.production_order.production_order.set_ser_no',
							freeze: true,
							args: {
								'gen_ser_no': this.get_values()["gen_ser_no"],
								'ser_no': this.get_values()["ser_no"],
								'pdn': frm.doc.name,
							},
							callback: function(r) {
								me.frm.reload_doc();
							}
						});
						this.hide();
					},
					primary_action_label: __('Serial No')
				});
				dialog.show();*/
		//			}
		//		});
			//}
		//}
	},
	validate: function(frm) {

		for (var n = 0; n < frm.doc.job_card.length; n++){
			console.log('frm.doc.job_card.length '+frm.doc.job_card.length);
			if(frm.doc.job_card[n].completed == '1'){
				if(frm.doc.job_card[n].idx == frm.doc.job_card.length){
					frappe.call({
						method: "tailorpad.admin.doctype.production_order.production_order.gen_ser_no",
						args: { "docid": frm.doc.name,
							"idx": frm.doc.job_card[n].idx,
							"fin": frm.doc.job_card[n].finished_qty,
						},
						callback: function(r){
							console.log('RRRRRR')
							console.log(r.message);
							var d = r.message;
							if(r.message){
								d.forEach( function(row,v) {
									console.log("RRR" + row);
									if(frm.doc.serial_no){
										frm.doc.serial_no += '\n' + row;
										for (var n = 0; n < frm.doc.production_order_table.length; n++){
										frappe.call({
											method: "tailorpad.admin.doctype.production_order.production_order.gen_se",
											args: { "docid": frm.doc.name,	
											"item_code":frm.doc.production_order_table[n].production_item,
											"serial_no":row

										},
										callback: function(r){

										}
									})
								}
									}
									else {
										for (var n = 0; n < frm.doc.production_order_table.length; n++){
										cur_frm.set_value('serial_no',row);
										frappe.call({
											method: "tailorpad.admin.doctype.production_order.production_order.gen_se",
											args: { "docid": frm.doc.name,	
													"item_code":frm.doc.production_order_table[n].production_item,
													"serial_no":row

										},
										callback: function(r){

															}
									})
										}
									}
									cur_frm.refresh_fields();
								});
							}
						}
					});
				}
			}
		}
		
		//for(var j=0;j<frm.doc.job_card.length; j++){
		//	console.log('IN VAL '+frm.doc.job_card[j].operation);
		//	if (frm.doc.job_card[j].is_subcontracted && frm.doc.job_card[j].completed) {
		//			frappe.db.get_value('Purchase Order', {'name': frm.doc.job_card[j].purchase_order}, 'status', (r) => {
		//				if ( r.status != 'Completed'){
		//					frappe.throw('This Operation Item Is Not Received Yet.So You Could Not Able To Complete.')
		//				}
		//			})
		//	}
			//console.log('TTTEST '+frm.doc.job_card[j].assigned_qty)
			/*if(frm.doc.job_card[j].assigned_qty != '0'){
				console.log('in asssigned '+frm.doc.job_card[j].assigned_qty)
				if(frm.doc.job_card[j].assigned_qty == frm.doc.job_card[j].completed_qty){
					console.log('equal')
					frm.doc.job_card[j].finished_qty = '';
					cur_frm.refresh_fields();
				}
			}*/
		//	if (frm.doc.job_card[j].completed_qty){
				/*if (frm.doc.job_card[j].completed_qty > frm.doc.job_card[j].assigned_qty){
					console.log('in');
					frm.doc.job_card[j].finished_qty = '';
					frappe.throw('Finished qty should not be greater than assigned qty in row number '+frm.doc.job_card[j].idx);
				}*/
		//	}
		//	if(frm.doc.job_card[j].assigned_qty != frm.doc.job_card[j].completed_qty){
		//		if (frm.doc.job_card[j].completed && !frm.doc.job_card[j].finished_qty){
		//			frappe.throw('Finished Qty is Mandatory in row number '+frm.doc.job_card[j].idx);
		//		}
		//	}
		//}
		if (!frm.is_new() && frm.doc.docstatus == 0) {
			console.log('not new');
			var counter = 0;
			for (var i = 0; i < frm.doc.production_order_table.length; i++){
					if (frm.doc.production_order_table[i].wo_submitted==1) {
							 counter++;
					}
			}
			var total = counter;
			console.log(total);
			console.log('b4'+frm.doc.production_order_table.length);
			if(total == frm.doc.production_order_table.length){
				console.log('tttt');
				for (var j=0; j<frm.doc.job_card.length; j++){
					if(frm.doc.job_card[j].employee && (!frm.doc.job_card[j].job_card) && (!frm.doc.job_card[j].is_subcontracted)){
						//Once the button is clicked create job card method is called
						frappe.call({
							method:"tailorpad.admin.doctype.production_order.production_order.create_po",
							args: { "docid": frm.doc.name,
									"emp": frm.doc.job_card[j].employee,
									"opn": frm.doc.job_card[j].operation,
									"ws": frm.doc.job_card[j].workstation || '',
									'rn': frm.doc.job_card[j].name,
									//'order_wise': frm.doc.job_card[j].order_wise
									//"work_order" : frm.doc.production_order_table[j].work_order,
									//'wo_sub': frm.doc.production_order_table[j].wo_submitted,
									},
							callback: function(r){
								console.log('msg')
								console.log(r.message)
								var d = r.message;
								d.forEach( function(row,v) {
									console.log(row);
									var child = frm.doc.job_card;
									console.log(d[2])
									child.forEach(function(e) {
										if(e.name == d[2]){
											console.log('in '+e.name)
											e.from_time = d[1];
											e.job_card = d[0];
										}
									})
									
								})
								/*if (r.message[2] == frm.doc.job_card[j].name){
									console.log('equal')
									frm.doc.job_card[j].job_card = r.message[0];
									frm.doc.job_card[j].from_time = r.message[1];
									console.log('set')

								}*/
								//cur_frm.reload_doc();
							}
							});
						}
					}
			}
		}
	},
});

frappe.ui.form.on("Production Order Table", {
	/*get_operation: function(frm,cdt,cdn){
		var child = locals[cdt][cdn];
		var arr = [];
		var rn = [];
		if (child.get_operation == 1){
			console.log("WORK WORK "+child.get_operation);
			arr.push(child.work_order);
			console.log('arr '+arr)
			var data = frm.doc.job_card;
			data.forEach(function(e){
				console.log('e '+e.work_order)
				if (e.work_order != arr){
					console.log('in cond '+e.name)
					rn.push(e.name);
					console.log('RN '+rn)
					for (var i in rn) {
						console.log(rn[i]);
						$("[data-name='"+rn[i]+"']").hide()
					}
				}
				else{
					for (var i in rn) {
						console.log(rn[i]);
						$("[data-name='"+rn[i]+"']").show()
					}
				}
			})
		}
		else if(child.get_operation == 0) {
			console.log('refresh')
			//cur_frm.refresh_field('job_card');
		}
	}*/
})
frappe.ui.form.on("Job Card Table",{
	employee: function(frm,cdt,cdn) {
		var child = locals[cdt][cdn];
		//child.assigned_qty = child.qty;
		//frappe.model.set_value(cdt, cdn, 'assigned_qty', child.qty);
		
		var prev_row = (child.idx-1);
		console.log('TEST '+child.idx);
		frappe.call({
			method: 'tailorpad.admin.doctype.production_order.production_order.get_prev_completed_qty',
			args: {
				'row': child.name,
				'order': child.order_wise || '',
				'docid': frm.doc.name,
				'emp': child.employee,
				'prev_row': prev_row,
				'qty': child.qty,
			},
			callback: function(r) {
				console.log('tesssss')
				console.log(r.message)
				if (r.message != undefined){
					var d = r.message;
					d.forEach( function(row,v) {
						console.log(row);
						var child = frm.doc.job_card;
						console.log(d[0]);
						child.forEach(function(e) {
							if(e.name == d[1]){
								console.log('nives '+e.name)
								console.log('dddd '+d[0])
								frappe.model.set_value(cdt, cdn, 'assigned_qty', d[0]);
								frappe.model.set_value(cdt, cdn, 'balance_qty', d[0]);
							}
						})
					});
				}
				else{
					console.log('ELSE NAME')
					frappe.model.set_value(cdt, cdn, 'assigned_qty', child.qty);
					frappe.model.set_value(cdt, cdn, 'balance_qty', child.qty);
				}

			}
		});

		
		console.log('INNNN '+child.assigned_qty + child.qty);
		cur_frm.refresh_fields();
		frappe.db.get_value('Manufacturing Settings', {name: 'Manufacturing Settings'}, 'follow_operations_order', (r) => {
			console.log('result '+r.follow_operations_order);
			var res = r.follow_operations_order;
			console.log(res);
			if (res == '1' && child.employee) {
				console.log('IFF '+child.operation + ' IDX '+child.idx);
				console.log('previous '+(child.idx-1));
				var prev_row = (child.idx-1);
				console.log('TEST '+child.idx);
				frappe.call({
					method: 'tailorpad.admin.doctype.production_order.production_order.val_order_wise',
					args: {
						'row': child.name,
						'order': child.order_wise,
						'docid': frm.doc.name,
						'emp': child.employee,
						'prev_row': prev_row,
						'qty': child.qty,
					},
					callback: function(r) {
					}
				});
			}
		})

		
		//cur_frm.refresh_fields();
		//if (child.employee) {
			/*frappe.model.set_value(cdt, cdn,"assigned_qty", child.qty);
			frappe.call({
				method: 'tailorpad.admin.doctype.production_order.production_order.set_qty',
				args: {
					'row': child.name,
					'qty': child.qty,
					'docid': frm.doc.name,
					'emp': child.employee
				},
				callback: function(r) {
				//	cur_frm.reload_doc();
				}
			});*/
		//}
		


			//frappe.model.set_value(cdt, cdn,"assigned_qty", child.qty);
			//cur_frm.set_value('assigned_qty',child.qty);
		//	child.assigned_qty = child.qty;
			//cur_frm.save();
		//	cur_frm.refresh_fields();
		//	child.assigned_qty = child.qty;
		//	console.log('AQ '+child.assigned_qty);
			
			//cur_frm.refresh_field('job_card');

		
		/*if (frappe.model.get_doc(cdt, cdn).employee){
			return frappe.call({
				method: "tailorpad.admin.doctype.production_order.production_order.set_assigned_qty",
				args: {
					"qty": frappe.model.get_doc(cdt, cdn).qty
					},
				callback: function(r) {
				console.log('msg '+r.message);
				if(r.message){
					frappe.model.set_value(cdt, cdn, "assigned_qty", r.message);}
					}
				});
				}*/
	},
	completed: function(frm,cdt,cdn) {
		var child = locals[cdt][cdn];
		var prev_row = (child.idx-1);
		console.log('TEST '+child.idx);
		frappe.call({
			method: 'tailorpad.admin.doctype.production_order.production_order.get_prev_val',
			args: {
				'prev_id': prev_row,
				'row': child.name,
				'docid': frm.doc.name
			},
			callback: function(r) {
				console.log('ADDTION')
				console.log(r.message[0])
				if(r.message[0] == 'add'){
					var c = child.assigned_qty + r.message[1];
					console.log('C '+c)
					frappe.model.set_value(cdt, cdn, "assigned_qty", c);
					frappe.model.set_value(cdt, cdn, "finished_qty", c);
					frappe.model.set_value(cdt, cdn, "balance_qty", c);
				}
				else if(r.message[0] == 'no add'){
					frappe.model.set_value(cdt, cdn, "assigned_qty", r.message[1]);
					frappe.model.set_value(cdt, cdn, "finished_qty", r.message[1]);
					frappe.model.set_value(cdt, cdn, "balance_qty", r.message[1]);
				}
				else if(r.message[0] == 'F'){
					var res = child.qty - child.completed_qty;
					frappe.model.set_value(cdt, cdn,"assigned_qty", res);
					frappe.model.set_value(cdt, cdn,"finished_qty", res);
					frappe.model.set_value(cdt, cdn, "balance_qty", res);
				}
			}
		});

		console.log('COND '+child.completed +child.balance_qty +child.completed_qty +child.assigned_qty)
		if(child.completed && child.balance_qty == child.assigned_qty && child.balance_qty != '0'){
			console.log('FIRST')
			frappe.model.set_value(cdt, cdn,"finished_qty", child.assigned_qty);
		}
		else if(child.completed && child.balance_qty < child.assigned_qty && child.balance_qty != '0'){
			console.log('SECOND')
			frappe.model.set_value(cdt, cdn,"finished_qty", child.balance_qty);	
		}
		else if(child.completed && child.balance_qty == child.assigned_qty && child.balance_qty == '0'){
			console.log('third')
			var res = child.qty - child.completed_qty;
			frappe.model.set_value(cdt, cdn,"assigned_qty", res);
			frappe.model.set_value(cdt, cdn,"finished_qty", res);
			frappe.model.set_value(cdt, cdn, "balance_qty", res);
		}
	}
/*	validate: function (frm,cdt,cdn) {
	var child = locals[cdt][cdn]
	frappe.call({
		method: "tailorpad.admin.doctype.production_order.production_order.gen_ser_no",
					args: { "docid": frm.doc.name,
						   },
					callback: function(r){ 
							console.log('ruom '+r.message);
							cur_frm.set_value('serial_no',r.message);
					 		frm.data = [];
							const dialog = new frappe.ui.Dialog({
							title: __("Select Serial No completed from Generated Serial No"),
					 		fields: [
									{
										fieldtype:'Small Text',
										fieldname:"gen_ser_no",
										default: r.message,
										readonly: '1',
										label: __('Generated Serial Numbers'),
									},
									{       
										fieldtype:'Check',
										fieldname:"ser_no",
										reqd: "1" ,
										label: __('Serial No completed'),
									}
								],
					primary_action: function() {
							//console.log('callback '+this.get_values()["gen_ser_no"]);
							//console.log('callback '+this.get_values()["ser_no"]);
							frappe.call({
								method: 'tailorpad.admin.doctype.production_order.production_order.set_ser_no',
								freeze: true,
								args: {
									'gen_ser_no': this.get_values()["gen_ser_no"],
									'ser_no': this.get_values()["ser_no"],
									'pdn': frm.doc.name,
								},
								callback: function(r) {
									me.frm.reload_doc();
									//if (!cur_frm.doc.__islocal) {cur_frm.timeline.insert_comment("<b> Sampling retest record created :</b> " +frm.doc.name + "  <b> from  :</b> " +child.ar_no);}
						   			//{ console.log("inside submit");cur_frm.save(); }

								}
							});
							this.hide();
					},
					primary_action_label: __('Serial No')
				});
				dialog.show();
			}
		});
	}*/
})

cur_frm.fields_dict['job_card'].grid.get_field("employee").get_query = function(doc, cdt, cdn) {
	var child = locals[cdt][cdn];
	return {
  		query: "tailorpad.admin.doctype.production_order.production_order.get_emp",
  		filters: {
	  		'item': child.item_name,
	  		'operation': child.operation
  		}
	}
}