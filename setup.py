from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in tailorpad/__init__.py
from tailorpad import __version__ as version

setup(
	name="tailorpad",
	version=version,
	description="Tailoring Application 2.0",
	author="White Hat Global",
	author_email="rk@whitehatglobal.org",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
