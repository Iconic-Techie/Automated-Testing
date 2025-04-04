# Copyright (c) 2025, Shruti Gupta and contributors
# For license information, please see license.txt

from openai import OpenAI
import frappe
from frappe.model.document import Document
import pandas as pd
import io
import unittest
import sys
import textwrap
import inspect
import ast
import os
import re


@frappe.whitelist()
def openai_api(docname, doc, script):
    
	client = OpenAI(
    	api_key="enter your api key here",  
	)

	chat_completion = client.chat.completions.create(
    	messages=[
			{"role": "system", "content": "You are software engineer"},
        	{"role": "user", "content": "Here is my python code, Write test cases for it in python. Respond with only the generated code so that I can run it without adjustments. Name the class TestClass(unittest.TestCase). All the test methods should be self-contained" + script,}
    	],
    	model="gpt-4o-mini",
	)
	
	response = chat_completion.choices[0].message.content
	print(response)

	return {"status": "Success", "message": response}

@frappe.whitelist()
def load_test_class(script):
    # Remove previously defined TestCase subclasses from globals
    to_delete = [
        name for name, obj in globals().items()
        if isinstance(obj, type) and issubclass(obj, unittest.TestCase)
    ]
    for name in to_delete:
        globals().pop(name)

    #cleans script
    script = clean_script(script)

    
    # Execute the new script
    before_exec = set(globals().keys())
    exec(script, globals())

    # Get the new test class
    new_test_classes = [
        obj for name, obj in globals().items()
        if name not in before_exec and isinstance(obj, type) and issubclass(obj, unittest.TestCase)
    ]

    if not new_test_classes:
        raise Exception("No TestCase class found.")
    
    return new_test_classes[0]

    
@frappe.whitelist()
def get_test_methods(script):
    script = clean_script(script)
    script = textwrap.dedent(script)
    tree = ast.parse(script)

    method_data = {}
    lines = script.splitlines()

    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
            # Get starting and ending line number
            start = node.lineno - 1
            end = node.end_lineno if hasattr(node, 'end_lineno') else start + 1

            # Grab method body and strip "def"
            body_lines = lines[start:end]
            if body_lines[0].startswith("def "):
                body_lines[0] = body_lines[0].replace("def ", "", 1)

            method_data[node.name + "(self)"] = "\n".join(body_lines)

    return method_data


@frappe.whitelist()
def run_single_test(script, method_name):
    test_class = load_test_class(script)

    method_name = method_name.split("(")[0]  # remove "(self)" if present
    test_instance = test_class(method_name)

    output_capture = io.StringIO()
    sys.stdout = output_capture

    result = unittest.TextTestRunner(stream=output_capture, verbosity=2).run(
        unittest.TestSuite([test_instance])
    )

    sys.stdout = sys.__stdout__

    return {
        "output": output_capture.getvalue(),
        "failures": len(result.failures),
        "errors": len(result.errors),
        "wasSuccessful": result.wasSuccessful()
    }


def clean_script(script):
    script = script.strip()

    if script.startswith("```") and script.endswith("```"): 
        script = script[3:-3].strip() 

    if script.startswith("python"):
        script = script[len("python"):].lstrip()  # Remove 'python' and leading whitespace

    return script


class AIDrivenTestCaseBuilder(Document):
	pass