frappe.provide("erpnext.stock");

frappe.ui.form.on('Item', 'item_naming_series', function(frm, cdt, cdn){
  var doc = frm.doc;
  frm.set_value('naming_series', doc.item_naming_series)
})


frappe.ui.form.on('Item', 'item_group', function(frm, cdt, cdn){
  var doc = frm.doc;
  frm.set_value('stock_uom', doc.item_group == 'Fabric' || doc.item_group == 'Fabric Sample' ? 'Meter' : 'Nos')
})

frappe.ui.form.on('Item', 'after_save', function(frm, cdt, cdn){
    if(!frm.doc.default_bom){
     return frappe.call({
            method:"tailorpad.custom_folder.custom_stock.bom_creation",
            args: {"docid":frm.doc.name},
            callback: function(r){
                cur_frm.reload_doc();}
            });

    }
})
frappe.ui.form.on('Item', {
validate: function(frm, cdt, cdn){
  var doc = frm.doc;
  if (frm.doc.style_fields){
  for (var i=0;i<frm.doc.style_fields.length;i++){
      frm.doc.style_fields[i].style_name = frm.doc.style_fields[i].style_option;
  }
  }

//  frm.set_value('stock_uom', doc.item_group == 'Fabric' || doc.item_group == 'Fabric Swatch Item' ? 'Meter' : 'Nos')
},
delete_available_garment_measurement: function(frm) {
    frappe.garment_confirmation(frm);

  },
  
  delete_available_measurement_template: function(frm) {
      frappe.body_confirmation(frm);
      
  },
  
  
  delete_available_alteration_measurement: function(frm) {
    frappe.alteration_confirmation(frm);
  },
  
  delete_available_style_template: function(frm) {
    frappe.style_confirmation(frm);

  },
  delete_available_product_option: function(frm) {
    frappe.product_confirmation(frm);

  },

})

cur_frm.fields_dict.fabric_item_code.get_query = function(doc) {
  return {filters: { item_group: "Fabric"}}
}

cur_frm.fields_dict.raw_material_code.get_query = function(doc) {
  return {
    "filters": [
      ['Item', 'item_group', 'in', 'Raw Material'],
      ['Item', 'is_sales_item','=','1']
    ]
  }
}

frappe.ui.form.on('Item', {
  fabric_item_code: function(frm) {
      if (frm.doc.fabric_item_code) {
        var allowed_fabric_items = frm.doc.allowed_fabric_items 
          ? frm.doc.allowed_fabric_items + '\n' + frm.doc.fabric_item_code : frm.doc.fabric_item_code;

        frm.set_value('allowed_fabric_items', allowed_fabric_items);
        frm.set_value('fabric_item_code', '');
      }
  },

  raw_material_code: function(frm) {
    if (frm.doc.raw_material_code) {
        var allowed_raw_materials = frm.doc.allowed_raw_materials 
          ? frm.doc.allowed_raw_materials + '\n' + frm.doc.raw_material_code : frm.doc.raw_material_code;

        frm.set_value('allowed_raw_materials', allowed_raw_materials);
        frm.set_value('raw_material_code', '');
      }
  }
})


frappe.ui.form.on('Item', 'make_work_order', function(frm, cdt, cdn){
  if(frm.doc.work_orders) {
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.make_work_order",
      args: {
        work_orders: frm.doc.work_orders
      },
      freeze: true,
      callback: function(r){
        refresh_field("work_orders")
      }
    })
  }
})


frappe.ui.form.on('Item', 'refresh', function(frm, cdt, cdn){
  var doc = frm.doc;
  hide_field('naming_series');
    cur_frm.fields_dict['body_measurement'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['measurement_fields'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['alteration_fields'].grid.wrapper.find('.grid-add-row').hide();
	cur_frm.fields_dict['style_fields'].grid.wrapper.find('.grid-add-row').hide();

  if(frappe.defaults.get_default("country") != 'India') {
    frm.toggle_display('hsn_sac', 0)
  } else {
    frm.toggle_display('hsn_sac', 1)
  }

  
  if(!doc.__islocal){
    hide_field('item_naming_series');
  }
  
})

cur_frm.cscript.make_clubbed_product = function(){
  frappe.model.open_mapped_doc({
    method: "tailorpad.admin.custom_methods.make_clubbed_product",
    frm: cur_frm
  });
}
cur_frm.fields_dict['style_fields'].grid.get_field('style_option').get_query = function(frm, cdt, cdn) {
	var child = locals[cdt][cdn];
	return{
	 // query: "tailorpad.admin.doctype.work_order.work_order.get_style_name",
	  filters:{ 'style_field': child.style_field}
	}
		
  }
  

cur_frm.cscript.measurement_template = function(doc, cdt, cdn){
  if(doc.measurement_template) {
    frappe.call({
    method: "tailorpad.custom_folder.custom_stock.fetch_item_measurement",
    args: {'measurement_template': doc.measurement_template},
    freeze: true,
    callback: function(r){
        if(r.message){
          cur_frm.clear_table("measurement_fields");
          $.each(r.message, function(k,v){
            var mfs = cur_frm.add_child("measurement_fields");
            mfs.measurement_field = v.measurement_field
            mfs.note = v.note
            mfs.image = v.image
            mfs.image_html = v.image_html
          })
          refresh_field('measurement_fields')
        }
    }
  });
  }
}


cur_frm.cscript.body_measurement_template = function(doc, cdt, cdn){
  if(doc.body_measurement_template) {
    frappe.call({
    method: "tailorpad.custom_folder.custom_stock.fetch_body_measurement",
    args: {'measurement_template': doc.body_measurement_template},
    freeze: true,
    callback: function(r){
        if(r.message){
          cur_frm.clear_table("body_measurement");
          $.each(r.message, function(k,v){
            var mfs = cur_frm.add_child("body_measurement");
            mfs.measurement_field = v.measurement_field
            mfs.note = v.note
            mfs.image = v.image
            mfs.image_html = v.image_html
          })
          refresh_field('body_measurement')
        }
    }
  });  
  }
  
}

cur_frm.cscript.alteration_template = function(doc, cdt, cdn){
  if(doc.alteration_template) {
    frappe.call({
    method: "tailorpad.custom_folder.custom_stock.fetch_item_measurement",
    args: {'measurement_template': doc.alteration_template},
    freeze: true,
    callback: function(r){
        if(r.message){
          cur_frm.clear_table("alteration_fields");
          $.each(r.message, function(k,v){
            var mfs = cur_frm.add_child("alteration_fields");
            mfs.measurement_field = v.measurement_field
            mfs.note = v.note
            mfs.image = v.image
            mfs.image_html = v.image_html
          })
          refresh_field('alteration_fields')
        }
    }
  });
  }
}




cur_frm.cscript.style_template = function(doc, cdt, cdn){
  if(doc.style_template){
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_style",
      args: {'style_template': doc.style_template},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.clear_table("style_fields");
            $.each(r.message, function(k,v){
             // if (v.default == "1"){
              var mfs = cur_frm.add_child("style_fields");
              mfs.default = v.default
              mfs.style_field = v.style_field
              mfs.style_name = v.style_name
              mfs.style_option = v.style_option
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_view = v.image_view
              mfs.html_image = v.html_image
              mfs.cost_to_customer = v.cost_to_customer
             // }
            })
            refresh_field('style_fields')
          }
      }
    });
  }
}


cur_frm.cscript.product_option = function(doc, cdt, cdn){
  if(doc.product_option){
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_product",
      args: {'product_option': doc.product_option},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.clear_table("product_fields");
            $.each(r.message, function(k,v){
             // if (v.default == "1"){
              var mfs = cur_frm.add_child("product_fields");
              mfs.default = v.default
              mfs.product_field = v.product_field
              mfs.product_name = v.product_name
              mfs.product_option = v.product_option
              mfs.note = v.note
              mfs.image = v.image
              mfs.image_view = v.image_view
              mfs.html_image = v.html_image
              mfs.cost_to_customer = v.cost_to_customer
             // }
            })
            refresh_field('product_fields')
          }
      }
    });
  }
}


cur_frm.cscript.image =  function(doc, cdt, cdn){
  var d =locals[cdt][cdn]
  var image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
  frappe.model.set_value('Style fields', d.name, 'html_image', image_view)
}

cur_frm.fields_dict.product_bundle_item.grid.get_field("item_code").get_query = function(doc, cdt, cdn){
  return {
    filters: {
			"is_stock_item": 1
		}
  }
}

cur_frm.fields_dict.items.grid.get_field("item_code").get_query = function(doc, cdt, cdn){
  return {
    "filters": [
      ['Item', 'item_group', 'in', 'Raw Material'],
      ['Item', 'is_sales_item','=','0']
    ]
  }
}

cur_frm.fields_dict.body_measurement_template.get_query = function(doc, cdt, cdn) {
 return {
    filters: {
      "measurement_template": 'Body Measurement'
    }
  } 
}

cur_frm.fields_dict.measurement_template.get_query = function(doc, cdt, cdn) {
 return {
    filters: {
      "measurement_template": 'Garment Measurement'
    }
  } 
}

cur_frm.fields_dict.alteration_template.get_query = function(doc, cdt, cdn) {
 return {
    filters: {
      "measurement_template": 'Alteration Measurement'
    }
  } 
}

frappe.ui.form.on('BOM Item', {
  item_code: function(frm, cdt, cdn) {
    get_bom_material_detail(frm.doc, cdt, cdn);
  }
})
frappe.ui.form.on('Style fields', {
  style_field: function(frm, cdt, cdn) {
    if(frm.doc.style_template){
    var child = locals[cdt][cdn];
    frappe.call({
      method: "tailorpad.custom_folder.custom_stock.fetch_style",
      args: {'style_template': frm.doc.style_template},
      freeze: true,
      callback: function(r){
          if(r.message){
            cur_frm.clear_table("style_fields");
            $.each(r.message, function(k,v){
              if (v.default == "1"){
              child.style_name = v.style_name
              child.style_option = v.style_option
              }
            })
           // refresh_field('style_fields')
          }
      }
    })
      }
  }
})

frappe.ui.form.on('BOM Operation', {
  setup: function(frm) {
    frm.add_fetch('operation', 'description', 'description')
  },

  operation: function(frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    if(!d.description) {
      frappe.model.set_value(cdt, cdn, 'description', frm.doc.operation)
    }
  },

  assign_trials: function(frm,cdt,cdn) {
    new erpnext.stock.AssignTrials(frm, cdt, cdn)
  },

  employee: function(frm, cdt, cdn) {
    var child = locals[cdt][cdn];
    if(!child.employees) {
      console.log("if" + child.employee);
      frappe.model.set_value(cdt, cdn, 'employees', child.employee)
    } else {
      console.log("else")
      child.employees += '\n' + child.employee
      frappe.model.set_value(cdt, cdn, 'employees', child.employees)
    }
    refresh_field('operations')
  }
})


var get_bom_material_detail= function(doc, cdt, cdn) {
  var d = locals[cdt][cdn];
  args = {
    'item_code': d.item_code,
    'qty': d.qty
  }

  if (d.item_code) {
    return frappe.call({
        method: "tailorpad.custom_folder.custom_item_details.get_bom_material_detail",
        args: {
          'item_code': d.item_code,
          'qty': d.qty
        },
        callback: function(r) {
          d = locals[cdt][cdn];
          $.extend(d, r.message);
          refresh_field("items");
        },
        freeze: true
    });
  }
}


frappe.ui.form.on('Style fields', {
  define_cost_to_tailor: function(frm, cdt, cdn) {
    new erpnext.stock.CosttoTailor(frm, cdt, cdn)
  }
})

frappe.ui.form.on('Measurement Fields', 'image', function(frm, cdt, cdn){
  var d = locals[cdt][cdn]
  var image_view = repl('<img width="100" src="%(image)s">', {image: d.image});
  frappe.model.set_value('Measurement Fields', d.name, 'image_html', image_view)
  refresh_field('image_view', d.name, 'measurement_fields')
})



erpnext.stock.AssignTrials = Class.extend({
  init: function(frm, cdt, cdn) {
    var d = locals[cdt][cdn]
    if (parseInt(d.trials)==1){
      this.frm = frm
      this.init_trials(d) // create dialog
      this.render_data(d) // to show data in the dialog
      this.add_trial(d) // add new rows
      this.save_data(d) // save data
      this.remove_row(d) // remove row
      this.auto_checked_actual_fabric()
      refresh_field('branch_dict')
    }
    else{
      alert("Click on Check box Trials")
    }
  },
  init_trials : function(data){
        this.dialog = new frappe.ui.Dialog({
            title:__('Trial'),
            fields: [
                {fieldtype:'Button', fieldname:'add_warehouse', label:__('Add Trial'), reqd:false,
                    description: __("")},
                {fieldtype:'HTML', fieldname:'styles_name', label:__('Styles'), reqd:false,
                    description: __("")}
            ]
        })
        $('.modal-content').css('width', '800px')
        $('[data-fieldname = "create_new"]').css('margin-left','100px')
        this.control_trials = this.dialog.fields_dict;
        this.div = $('<div id="myGrid" style="width:100%;height:200px;margin:10px;overflow-y:scroll;"><table class="table table-bordered" style="background-color: #f9f9f9;height:10px" id="mytable">\
                    <thead><tr ><td>Operation</td><td>Trial No</td><td>Quality Check</td><td>Actual Fabric</td>\
                    <td>Amendment</td><td>Trial Cost</td><td>Remove</td></tr></thead><tbody></tbody></table></div>').appendTo($(this.control_trials.styles_name.wrapper))

        this.dialog.show();
    },
    render_data: function(data){
        var me =this;
        var $trial_data;
        if (data.branch_dict){
            $trial_data = JSON.parse(data.branch_dict)
            for(j in $trial_data)
            {
                if($trial_data[j]['trial']){
                    me.table = $(me.div).find('#mytable tbody').append('<tr><td>'+$trial_data[j]['operation']+'</td>\
                        <td>'+$trial_data[j]['trial']+'</td>\
                        <td><input id="quality_check" class="quality_check" type="checkbox" name="quality_check" '+$trial_data[j]['quality_check']+'></td>\
                        <td><input id="actual_fabric" class="quality_check" type="checkbox" name="actual_fabric" '+$trial_data[j]['actual_fabric']+'></td>\
                        <td><input id="amended" class="quality_check" type="checkbox"  name="amended" '+$trial_data[j]['amended']+'></td>\
                        <td><input type="Textbox" class="text_box" value="'+$trial_data[j]['cost']+'"></td>\
                        <td>&nbsp;<button  class="remove">X</button></td></tr>') 
                }
            }
        }
    },
    add_trial: function(data){
        var me = this;
        this.table;
        if(!data.last_trial_no) {
          data.last_trial_no = 0;
        }

        $(this.control_trials.add_warehouse.input).click(function(){
            var ch = ''
            data.last_trial_no += 1
            if($(me.div).find('#mytable tbody tr:last td:eq(3) .quality_check').is(':checked') ==true){
                ch = 'checked'
            }
            this.table = $(me.div).find('#mytable tbody').append('<tr><td>'+data.operation+'</td><td>'+data.last_trial_no+'</td>\
                <td><input class="quality_check" type="checkbox" name="quality_check"></td>\
                <td><input id="actual_fabric" class="quality_check" type="checkbox" name="actual_fabric" '+ch+'></td>\
                <td><input class="quality_check" type="checkbox" name="amended" ></td><td><input class="text_box" data-fieldtype="Int" type="Textbox">\
                </td><td>&nbsp;<button  class="remove">X</button></td></tr>')
            $('[data-fieldname="trial"]').val('')
            me.auto_checked_actual_fabric()
            me.remove_row(data)
        })
    },
    save_data : function(data){
        var me = this;

        this.dialog.set_primary_action(__("Save"), function() {
            var status='true';
            var trials_dict={};
            $(me.div).find("#mytable tbody tr").each(function(i) {
                var key =['operation','trial', 'quality_check','actual_fabric','amended','cost','cancel']
                var $data= {};
                trial_no = i;
                cells = $(this).find('td')
                $(cells).each(function(i) {
                    if(i==1 && parseInt($(this).text())!=(trial_no + 1)){
                        data.branch_dict ="";
                        status ='false';
                        return status
                    }
                    var d1 = $(this).find('.quality_check').is(':checked') ? 'checked' : $(this).find('.text_box').val() || $(this).text();
                    $data[key[i]]=d1
                    if(i==1) {                    
                      data.last_trial_no = $(this).text();
                    }
                })
                trials_dict[i]=($data)
            })

            if(status=='true' && trials_dict){
                if (!Object.keys(trials_dict).length) {
                  data.last_trial_no = 0;
                }
                data.trials_qc = me.find_trials_hasQC(trials_dict, 'quality_check')
                data.actual_fabric = me.find_trials_hasQC(trials_dict, 'actual_fabric')
                data.branch_dict = JSON.stringify(trials_dict)
                refresh_field('operations')
                me.dialog.hide()
                me.frm.save()
            }else{
                alert("Trials must be in sequence")
            }
        })
    },
    find_trials_hasQC: function(trials_dict, type){
        msg = 0
        $.each(trials_dict, function(i){
            if(trials_dict[i][type] == 'checked'){
                msg = 1
            }
        })
        return msg
    },

    remove_row : function(d){
        var me =this;
        $(this.div).find('.remove').click(function(){
            id = $(this).closest('tr').find('td:eq(1)').text();
            $(this).parent().parent().remove()
            d.last_trial_no = cint(id) - 1;
        })
    },
    add_branch : function(doc, cdt, cdn){
        var d =locals[cdt][cdn]
        status = this.check_duplicate(d)
        if (status=='true' && d.warehouse){
            if(d.branch_list){
                d.branch_list += '\n'+d.warehouse   
            }
            else{
                d.branch_list=d.warehouse
            }
        }
        else{
            alert("process already available or process not selected")
        }
        refresh_field('operations')
    },
    check_duplicate: function(data){
        if(data.branch_list){
            branches = (data.branch_list).split('\n')
            for(i=0;i<branches.length;i++){
                  if(data.warehouse == branches[i]){
                      return 'false'      
                  }
            }
        }
        return 'true'
    },
    price_list: function(doc, cdt, cdn){
        var s;
        // new frappe.CustomerRate(doc, cdt, cdn)
    },
    is_clubbed_product : function(doc){
        doc.has_serial_no = 0
        refresh_field('has_serial_no')
    },
    auto_checked_actual_fabric: function(){
        var me = this
        $(me.div).find('[name="actual_fabric"]').click(function(){
            var s= $(this).parent().parent().index();
            var count = $('#mytable').children('tbody').children('tr').length;
            for(i=s+1 ; i<count;i++)
            {
                $(me.div).find('#mytable tbody tr:eq('+i+') td:eq(3) .quality_check').prop('checked','checked')
            }
        })
    }
})


erpnext.stock.CosttoTailor = Class.extend({
  init:function(frm, cdt, cdn){
        this.frm = frm;
        this.d = locals[cdt][cdn]
        this.init_cost_to_tailor()
        this.render_cost_to_tailor_form()
        this.add_cost_to_tailor()
        this.save_tailor_cost()

  },
  init_cost_to_tailor:function(){
     this.dialog = new frappe.ui.Dialog({
        title:__('Cost To Tailor'),
        fields: [
            {fieldtype:'Link', fieldname:'process',options:'Operation', label:__('Operation'), reqd:false,
                description: __("")},
            {fieldtype:'Button', fieldname:'add_tailor_cost', label:__('Add'), reqd:false,
                description: __("")},
            {fieldtype:'HTML', fieldname:'tailor_cost_name', label:__('Styles'), reqd:false,
                description: __("")}
        ]
    })
    $('.modal-content').css('width', '800px')
    $('[data-fieldname = "create_new"]').css('margin-left','100px')
    this.control_tailor_cost = this.dialog.fields_dict;
    this.div = $('<div id="myGrid" style="width:100%;height:200px;margin:10px;overflow-y:scroll;"><table class="table table-bordered" style="background-color: #f9f9f9;height:10px" id="mytable">\
                <thead><tr ><td>Process</td><td>Tailor Cost</td><td>Remove</td></tr></thead><tbody></tbody></table></div>').appendTo($(this.control_tailor_cost.tailor_cost_name.wrapper))

    
    this.dialog.show();


  },
  render_cost_to_tailor_form:function(){
    var me = this
    if(me.d.process_wise_tailor_cost){
        tailor_dict = JSON.parse(me.d.process_wise_tailor_cost)
        $.each(tailor_dict,function(key,value){
            $(me.div).find('#mytable tbody').append('<tr id="my_row"><td>'+key+'</td>\
            <td id="cost"><input class="text_box" data-fieldtype="Int" type="Textbox" value='+value+'>\
            </td><td>&nbsp;<button  class="remove">X</button></td></tr>')
             me.remove_row()
        })
    }
  },
  add_cost_to_tailor:function(){

    var me = this;
    this.table;
    $(this.control_tailor_cost.add_tailor_cost.input).click(function(){
        this.table = $(me.div).find('#mytable tbody').append('<tr id="my_row"><td>'+me.control_tailor_cost.process.input.value+'</td>\
            <td><input class="text_box" data-fieldtype="Int" type="Textbox">\
            </td><td>&nbsp;<button  class="remove">X</button></td></tr>')
        me.remove_row()
    })

  },
  save_tailor_cost:function(){
    var me = this
    this.dialog.set_primary_action(__("Save"), function() {
      this.tailor_cost_dict = {}
      var inner_me = this
      $(me.div).find('#mytable tr#my_row').each(function(i,value){
        var $td = $(this).find('td')
          var process_name = ''
        $($td).each(function(inner_index){
          
            if(inner_index == 0){
                process_name = $(this).text()
                inner_me.tailor_cost_dict[$(this).text()]=[]
            }
            if(inner_index == 1){
                inner_me.tailor_cost_dict[process_name]=$(this).find('input').val()
            }
           
        })
      })
      me.d.process_wise_tailor_cost = JSON.stringify(this.tailor_cost_dict)
      refresh_field(['style_fields',me.d.name,'process_wise_tailor_cost'])
      me.dialog.hide()
      me.frm.save()
    })
  },
  remove_row : function(){
        var me =this;
        $(this.div).find('.remove').click(function(){
            $(this).parent().parent().remove()
        })
    },
})

frappe.body_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available body measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.body_measurement_template) {
      
        frm.set_value('body_measurement_template', '');
        frm.set_value('body_measurement', '');
        frm.save()
		}
    d.hide();
		},
	//	secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}

frappe.garment_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available garment measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.measurement_template) {
      
        frm.set_value('measurement_template', '');
        frm.set_value('measurement_fields', []);
        frm.save();
       // frm.reload_doc();
      
    }
    d.hide();
		},
		//secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}

frappe.alteration_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available alteration measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.alteration_template) {
      
        frm.set_value('alteration_template', '');
        frm.set_value('alteration_fields', '');
        frm.save();
      //  frm.reload_doc();
     }
    d.hide();
		},
		//secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}
frappe.style_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available style measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.style_template) {
      
        frm.set_value('style_template', '');
        frm.set_value('style_fields', []);
        frm.save();
        //frm.reload_doc();
      }
    d.hide();
		},
		//secondary_action_label: __("No")
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}


frappe.product_confirmation = function(frm, message, ifyes, ifno) {
	var d = new frappe.ui.Dialog({
		title: __("Confirm"),
		fields: [
			{fieldtype:"HTML", options:`<p class="frappe-confirm-message">${'Do you want to delete available style measurement template?'}</p>`}
		],
		primary_action_label: __("Yes"),
		primary_action: function() {
			if(ifyes) ifyes();
			if(frm.doc.product_option) {
      
        frm.set_value('product_option', '');
        frm.set_value('product_fields', []);
        frm.save();
      }
    d.hide();
		},
		
	});
	d.show();
    d.confirm_dialog = true;
	if(ifno){;
		d.onhide = function() {
			if(!d.primary_action_fulfilled) {
				ifno();
			}
		};
	}
	return d;
}








