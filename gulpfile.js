"use strict";

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var coveralls = require('gulp-coveralls');
var rename = require('gulp-rename');
var karma = require('karma').server;
var serve = require('gulp-serve');

var _coverage = 'coverage/**/lcov.info';
var _app = './src/splitBox.js';
var _appMin = 'splitBox.min.js';
var _dist = './dist/js';

gulp.task('serve', serve(
{
    root: ['docs', 'dist'],
    port: 1234
}));

gulp.task('build', ['unit_test'], function()
{
    gulp
        .src(_app)
        .pipe(uglify())
        .pipe(rename(_appMin))
        .pipe(gulp.dest(_dist));
})

gulp.task('unit_test', function(done)
{
    var _opts = {
                  configFile: __dirname + '/karma.conf.js',
                  singleRun: true,
                  browsers: ['PhantomJS']
               };

    karma.start(_opts, done);
})

gulp.task('coverage', ['unit_test'], function()
{
    gulp
        .src(_coverage)
        .pipe(coveralls());
})

gulp.task('ngdocs', ['build'], function()
{
    var gulpDocs = require('gulp-ngdocs');
    var options = {
        scripts: ['splitBox.min.js'],
        title: 'api文档',
        html5Mode: false
    };

    return gulp.src('./src/splitBox.js')
        .pipe(gulpDocs.process(options))
        .pipe(gulp.dest('./docs'));
});
