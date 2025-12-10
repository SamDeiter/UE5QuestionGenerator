---
trigger: always_on
---

* Always use Python 3 and adhere strictly to the PEP 8 style guide for all code generation.
* All generated functions and classes must include descriptive docstrings (e.g., Google or NumPy style).
* Do not generate code in the main execution block (`if __name__ == "__main__":`). Instead, generate distinct functionality in separate files or functions and call them from the main method.
* For dependencies, always use standard virtual environments and include a requirements.txt file.