// Copyright (c) 2025, Shruti Gupta and contributors 
// For license information, please see license.txt

frappe.ui.form.on("AI-Driven Test Case Builder", {
    refresh(frm) {

        //generate test cases button
        frm.add_custom_button(__('Generate Test Cases'), function() {
            frappe.call({
                method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.openai_api",
                args: {
                    docname: frm.doc.name,
                    script: frm.doc.script,
                    doc: frm.doc
                },
                callback: function(response) {
                    if (response.message) {
                        frm.set_value("unit_testing_script", response.message.message); // Set the generated test case in the form field
                        frm.refresh_field("unit_testing_script"); // Refresh the field to show the updated value
                        // Optional: Log the full API response for debugging
                        console.log("API Response:", response.message);
                    }
                    else {
                        frappe.msgprint(__('No test cases generated. Please check the script or try again.'));
                        console.error("Error in Test Case Generation:", response);
                    }

                    frappe.call({
                        method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.get_test_methods",
                        args: {
                            script: frm.doc.unit_testing_script,
                        },
                        callback: function(response) {
                            const results = response.message;
                            console.log("Test Methods:" + results);
                    
                            // Clear existing rows
                            frm.clear_table("unit_test_execution");
                    
                            //Add each result to the table
                            let index = 1;
                            for (const method_signature in results) {
                                const method_body = results[method_signature];
                        
                                frm.add_child("unit_test_execution", {
                                    test_number: `Test ${index}`,
                                    method_name: method_signature,
                                    code: method_body
                                });
                        
                                index++;
                            }
                    
                            // Refresh the table field to show updated rows
                            frm.refresh_field("unit_test_execution");
                            
                        }
                    }); 
                }
            });
        }, __("Generate Unit Tests"));

        //Custom Button of Code Recommendations
        frm.add_custom_button(__('Code Recommendations'), function() {
            frappe.call({
                method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.openai_code_improvement",
                args: {
                    script: frm.doc.script
                },
                callback: function(response) {
                    if (response.message) {
                        console.log("Recommendation Response:", response.message);
    
    
                        const results = response.message.message;
                        console.log("Recommended codes:" + results);
    
                        const programs = [];
                        const regex = /```python([\s\S]*?)```/g;
                        let match;
    
                        while ((match = regex.exec(results)) !== null) {
                        programs.push(match[1].trim());
                        }
    
                        console.log(programs);
                        frm.clear_table("recommended_code_listings");
                    
                        // Add each result to the table
                        let index = 1;
                        for (const code_recommendation in programs) {
                            const code_applied = programs[code_recommendation];
                    
                            frm.add_child("recommended_code_listings", {
                                version: `Version ${index}`,
                                script: code_applied
                            });
                    
                            index++;
                        }
                
                        // Refresh the table field to show updated rows
                        frm.refresh_field("recommended_code_listings");
    
    
                    }
                    else {
                        frappe.msgprint(__('No Recommendation generated. Please check the script or try again.'));
                        console.error("Error in Generation recommendation:", response);
                    }
                }
            });
        }, __("Code Recommendations"));
    }
});



// Field Code Recommendations Button of Type button
frappe.ui.form.on('AI-Driven Test Case Builder', {
    code_recommendations: function(frm) {

        frappe.call({
            method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.openai_code_improvement",
            args: {
                script: frm.doc.script
            },
            callback: function(response) {
                if (response.message) {
                    console.log("Recommendation Response:", response.message);


                    const results = response.message.message;
                    console.log("Recommended codes:" + results);

                    const programs = [];
                    const regex = /```python([\s\S]*?)```/g;
                    let match;

                    while ((match = regex.exec(results)) !== null) {
                    programs.push(match[1].trim());
                    }

                    console.log(programs);
                    frm.clear_table("recommended_code_listings");
                
                    // Add each result to the table
                    let index = 1;
                    for (const code_recommendation in programs) {
                        const code_applied = programs[code_recommendation];
                
                        frm.add_child("recommended_code_listings", {
                            version: `Version ${index}`,
                            script: code_applied
                        });
                
                        index++;
                    }
            
                    // Refresh the table field to show updated rows
                    frm.refresh_field("recommended_code_listings");


                }
                else {
                    frappe.msgprint(__('No Recommendation generated. Please check the script or try again.'));
                    console.error("Error in Generation recommendation:", response);
                }
            }
        });
    }

})

frappe.ui.form.on('Test Cases Execution', {
    run_test: function (frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        const testCasesScript = frm.doc.unit_testing_script
        const regex = new RegExp(`(\\s*)(${row.method_name.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, "\\$&")})[\\s\\S]*?(?=\\n\\s*def |\\n\\s*\\Z)`, 'g');

        
        const updatedScript = testCasesScript.replace(regex, (match, indentation) => {
            // Ensure the new string matches the indentation level of the original
            return indentation + row.code.split('\n').map(line => indentation + line).join('\n');
          });

        const finalTestCase =   updatedScript.replace(/\bdef\b\s+\bdef\b/, 'def');

        frm.set_value("unit_testing_script", finalTestCase); // Set the generated test case in the form field
        frappe.call({
            method: "library_management.library_management.doctype.ai_driven_test_case_builder.ai_driven_test_case_builder.run_single_test",
            args: {
                script: finalTestCase,  // full script is stored in the parent doc
                method_name: row.method_name       // test method name from that row
            },
            callback: function (response) {
                const result = response.message;

                // Show result as a popup
                frappe.msgprint({
                    title: __('Test Result: ' + row.method_name),
                    message: `<pre>${result.output}</pre>`,
                    indicator: result.wasSuccessful ? 'green' : 'red'
                });

                // Update result + output in row
                row.result = result.wasSuccessful ? "Pass" : "Fail";
                row.code_output = result.output;
                frm.refresh_field("unit_test_execution");
            }
        });
    }
});
