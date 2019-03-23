#!/bin/sh

YUI="/usr/bin/java -jar ~/scripts/yuicompressor/yuicompressor-2.4.8.jar"

NOW=`date +"%s"`

rm css/header.*.min.css
/usr/bin/java -jar ~/scripts/yuicompressor/yuicompressor-2.4.8.jar -o css/header.${NOW}.min.css \
		css/vendor/header/bootstrap.css \
		css/vendor/header/font-awesome.css

rm js/footer.*.min.js
/usr/bin/java -jar ~/scripts/yuicompressor/yuicompressor-2.4.8.jar --preserve-semi -o js/footer.${NOW}.min.js \
		js/vendor/footer/jquery.js \
		js/vendor/footer/jquery-migrate.js \
		js/vendor/footer/bootstrap.js \
		js/vendor/footer/knockout-debug.js \
		js/vendor/footer/knockout.mapping.js \
		js/vendor/footer/bootbox.js \
		js/vendor/footer/jquery.cookie.js \
		js/vendor/footer/jquery.json.min.js \
		js/vendor/footer/jquery.ba-hashchange.js
				
