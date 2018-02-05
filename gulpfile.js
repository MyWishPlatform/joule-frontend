require('./gulp.server.js');
var gulp = require('gulp'),
    sass = require('gulp-sass'),
    path = require('path'),
    concat = require('gulp-concat'),
    uglifyjs = require('gulp-uglifyjs'),
    runSequence = require('run-sequence'),
    angularTemplatecache = require('gulp-angular-templatecache'),
    uglifycss = require('gulp-uglifycss'),
    rev = require('gulp-rev'),
    del = require('del'),
    browserify = require('gulp-browserify'),
    // autoprefixer = require('gulp-autoprefixer'),
    revReplace = require("gulp-rev-replace"),
    sourcemaps = require("gulp-sourcemaps");

var output = 'app';
var input = 'dist';
var isProduction;

var folders = {
    'ts': 'ts',
    'js': 'js',
    'scss': 'scss',
    'fonts': 'fonts',
    'favicon': 'favicon',
    'css': 'css',
    'npm': './node_modules',
    'templates': 'templates',
    'media': 'media',
    'images': 'images',
    'static': 'static',
    'bower': 'bower_components',
    'i18n': 'i18n'
};


/* Favicon */
gulp.task('app:favicon', function() {
    return gulp.src(path.join(output, folders['favicon'], '**/*'))
        .pipe(gulp.dest(path.join(input, 'static', folders['favicon'])));
});

/* Styles images collection */
gulp.task('app:images', function() {
    return gulp.src(path.join(output, folders['images'], '**/*'))
        .pipe(gulp.dest(path.join(input, 'static', folders['images'])));
});

/* Fonts collection */
gulp.task('app:fonts', function() {
    return gulp.src(path.join(output, folders['scss'], 'fonts', '**/*'))
        .pipe(gulp.dest(path.join(input, 'static', folders['css'], folders['fonts'])));
});

gulp.task('app:templates-clean', function () {
    return del([path.join(input, 'static', 'tpl', 'templates*')]);
});
gulp.task('app:templates', ['app:templates-clean'], function () {
    return gulp
        .src(path.join(output, folders['templates'], '**/*.html'))
        .pipe(angularTemplatecache('templates.tpl.js', {
            standalone: true,
            root: "/templates/"
        }))
        //.pipe(uglifyjs({mangle: false}))
        .pipe(rev())
        .pipe(gulp.dest(path.join(input, 'static', 'tpl')))
        .pipe(rev.manifest('templates.json'))
        .pipe(gulp.dest(path.join(input, 'static', 'tpl')));
});

gulp.task('app:css-clean', function () {
    return del([path.join(input, 'static', folders['css'], '**/*.css')]);
});
/* Styles collection */
gulp.task('app:css', ['app:css-clean'], function() {
    return gulp.src(path.join(output, folders['scss'], '*.scss'))
        .pipe(sass())
        .pipe(gulp.dest(path.join(input, 'static', folders['css'])))
        //.pipe(uglifycss())
        .pipe(rev())
        .pipe(gulp.dest(path.join(input, 'static', folders['css'])))
        .pipe(rev.manifest())
        .pipe(gulp.dest(path.join(input, 'static', folders['css'])));
});

gulp.task('app:vendors-clean', function () {
    return del([path.join(input, 'static', 'vendors', '**/*')]);;
});
/* Vendors scripts collection */
gulp.task('app:vendors', ['app:vendors-clean'], function() {
    return gulp.src(
        [
            // path.join(folders['npm'], 'web3', 'dist', 'web3.min.js'),
            path.join(folders['npm'], 'jquery', 'dist', 'jquery.min.js'),
            path.join(folders['npm'], 'angular', 'angular.min.js'),
            path.join(folders['npm'], 'angular-resource', 'angular-resource.min.js'),
            path.join(folders['npm'], 'angular-cookies', 'angular-cookies.min.js'),
            path.join(folders['npm'], 'moment', 'min', 'moment.min.js'),
            path.join(folders['npm'], 'moment-timezone', 'builds', 'moment-timezone-with-data.min.js'),
            path.join(folders['npm'], 'angular-ui-router', 'release', 'angular-ui-router.min.js'),
            path.join(folders['npm'], 'bignumber.js', 'bignumber.min.js'),
            path.join(output, 'vendors', '**/*')
        ])
        .pipe(concat('vendors.js'))
        .pipe(sourcemaps.init({
            loadMaps: true
        }))
        .pipe(sourcemaps.write())
        .pipe(rev())
        .pipe(gulp.dest(path.join(input, 'static', 'vendors')))
        .pipe(rev.manifest())
        .pipe(gulp.dest(path.join(input, 'static', 'vendors')));
});


gulp.task('all:js-start', ['app:js'], function() {
    return gulp.start('app:revision');
});

gulp.task('all:templates-start', ['app:templates'], function() {
    return gulp.start('app:revision');
});


gulp.task('app:web3', function() {
    return gulp.src(path.join(output, 'web3.js'))
        .pipe(browserify())
        .pipe(gulp.dest(path.join(input, 'static', 'web3')));
});


gulp.task('app:js-clean', function () {
    return del([path.join(input, 'static', 'js', 'main*')]);
});
/* Scripts collection */
gulp.task('app:js', ['app:js-clean'], function() {
    return gulp.src([
        path.join(output, folders['js'], '**/*')])
        .pipe(concat('main.js'))
        .pipe(gulp.dest(path.join(input, 'static', folders['js'])))
        .pipe(rev())
        .pipe(gulp.dest(path.join(input, 'static', folders['js'])))
        .pipe(rev.manifest('main.json'))
        .pipe(gulp.dest(path.join(input, 'static', folders['js'])));
});

/* Styles images collection */
gulp.task('app:css-images', function() {
    return gulp.src(path.join(output, folders['scss'], 'images', '**/*'))
        .pipe(gulp.dest(path.join(input, 'static', folders['css'], 'images')));
});


gulp.task('app:revision', function() {
    var manifestCSS = gulp.src(path.join(input, 'static', folders['css'], 'rev-manifest.json'));
    var manifestJS = gulp.src(path.join(input, 'static', folders['js'], 'main.json'));
    var manifestVendors = gulp.src(path.join(input, 'static', 'vendors', 'rev-manifest.json'));
    var manifestTemplates = gulp.src(path.join(input, 'static', 'tpl', 'templates.json'));

    return gulp.src([path.join(output, '*.html')])
        .pipe(revReplace({manifest: manifestCSS}))
        .pipe(revReplace({manifest: manifestJS}))
        .pipe(revReplace({manifest: manifestVendors}))
        .pipe(revReplace({manifest: manifestTemplates}))
        .pipe(gulp.dest(input))
});



gulp.task('app:rev', ['app:css', 'app:vendors', 'all:js-start', 'app:templates'], function() {
    return gulp.start('app:revision');
});
gulp.task('css:watcher', ['app:css'], function() {
    return gulp.start('app:revision');
});

gulp.task('watcher',function() {
    gulp.watch(path.join(output, folders['scss'], '**/*'), function() {
        gulp.start('css:watcher');
    });
    gulp.watch(path.join(output, folders['js'], '**/*'), function() {
        runSequence('all:js-start');
    });
    gulp.watch(path.join(output, folders['templates'], '**/*'), function() {
        runSequence('all:templates-start');
    });
    // gulp.watch(path.join(output, '*.html'), function() {
    //     runSequence('app:revision');
    // });
});





gulp.task('default', ['app:images', 'app:favicon', 'app:fonts', 'app:css-images', 'watcher', 'app:rev', 'app:web3'],
    function() {
        if (!isProduction) {
            return gulp.start('serve');
        }
    }
);

gulp.task('production', function(cb) {
    isProduction = true;
    runSequence('default', cb);
});
