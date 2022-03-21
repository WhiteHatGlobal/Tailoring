frappe.ui.form.on('User', 'refresh', function(frm, cdt, cdn){
  module_list = ['Core', 'All Applications', 'Website', 'Tailorpad']
  $.each(module_list, function(i, val){
    $(repl('[data-module="%(module_name)s"]', {module_name: val})).parent().parent().parent().css("display", "none")
  })
})
