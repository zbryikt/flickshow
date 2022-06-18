#!/usr/bin/env node
var colors, fs, path, os, fsExtra, browserify, yargs, child_process, glob, cmds, slice$ = [].slice;
colors = require('@plotdb/colors');
fs = require('fs');
path = require('path');
os = require('os');
fsExtra = require('fs-extra');
browserify = require('browserify');
yargs = require('yargs');
child_process = require('child_process');
glob = require('glob');
cmds = {};
cmds['default'] = {
  command: '$0',
  desc: 'copy module code to specified frontend folders',
  builder: function(yargs){
    return yargs.option('symlink', {
      alias: 's',
      description: "use symlink instead of hard copy to make main folder. default true",
      type: 'boolean'
    }).option('local', {
      alias: 'l',
      description: "use local folder for a specific module, with module:dir syntax"
    }).option('use-dist', {
      type: 'boolean',
      description: "enable legacy mode which uses `dist/` folder as base files to copy"
    });
  },
  handler: function(argv){
    var ret, localModules, useSymlink, fed, extModules;
    if (argv.l) {
      ret = argv.l.split(';').map(function(it){
        return it.split(':');
      });
      localModules = ret.map(function(it){
        return {
          name: it[0],
          path: path.resolve(it[1].replace(/^~/, os.homedir()))
        };
      });
    } else {
      localModules = [];
    }
    useSymlink = argv.s != null ? argv.s : true;
    fed = import$({
      root: '.',
      modules: []
    }, JSON.parse(fs.readFileSync("package.json").toString()).frontendDependencies || {});
    extModules = localModules.filter(function(o){
      return !fed.modules.filter(function(it){
        return it === o.name;
      }).length;
    });
    if (extModules.length) {
      console.warn("following modules are not listed in fedep modules. still installed:".yellow);
      console.warn(extModules.map(function(it){
        return " - " + it.name;
      }).join('\n').yellow);
      fed.modules = fed.modules.concat(extModules.map(function(it){
        return it.name;
      }));
    }
    return (fed.modules || []).map(function(obj){
      var localModule, root, info, id, mainFile, ref$, i$, name, version, ret, that, desdir, maindir, p, srcdir, realSrcdir, srcFile, desFile;
      obj = typeof obj === 'string' ? {
        name: obj
      } : obj;
      localModule = localModules.filter(function(it){
        return it.name === obj.name;
      })[0];
      if (localModules.length && !localModule) {
        return;
      }
      if (localModule) {
        root = localModule.path;
      } else {
        root = path.join("node_modules", obj.name);
      }
      info = JSON.parse(fs.readFileSync(path.join(root, "package.json")).toString());
      id = info._id || info.name + "@" + info.version;
      mainFile = {
        js: [info.browser, info.main].filter(function(it){
          return /\.js/.exec(it);
        })[0],
        css: [info.style, info.browser, info.main].filter(function(it){
          return /\.css/.exec(it);
        })[0]
      };
      if (/\.\.|^\//.exec(id)) {
        throw new Error("fedep: not supported name in module " + obj.name + ".");
      }
      ref$ = id.split("@"), name = 0 < (i$ = ref$.length - 1) ? slice$.call(ref$, 0, i$) : (i$ = 0, []), version = ref$[i$];
      if (ret = /#([a-zA-Z0-9_.-]+)$/.exec(version)) {
        version = ret[1];
      }
      if (/\//.exec(version)) {
        version = version.replace(/\//g, '-');
      }
      name = (that = name[0])
        ? that
        : name[1]
          ? "@" + name[1]
          : name.join('@');
      if (localModule) {
        desdir = path.join(fed.root, name, 'local');
      } else {
        desdir = path.join(fed.root, name, version);
      }
      maindir = path.join(fed.root, name, "main");
      fsExtra.removeSync(desdir);
      if (!localModule) {
        fsExtra.ensureDirSync(desdir);
      }
      if (obj.browserify) {
        p = new Promise(function(res, rej){
          var b;
          b = browserify(typeof obj.browserify === 'object' ? obj.browserify : void 8);
          b.require(obj.name);
          return b.bundle(function(e, buf){
            if (e) {
              return rej(new Error(e));
            }
            fs.writeFileSync(path.join(desdir, name + ".js"), buf);
            console.log(" --", "(module -> browserify)".green, "-> " + desdir + " ");
            return res();
          });
        });
      } else {
        if (obj.dir) {
          srcdir = path.join(root, obj.dir);
        } else if (argv.useDist) {
          srcdir = path.join(root, "dist");
          if (!fs.existsSync(srcdir)) {
            srcdir = root;
          }
        } else {
          srcdir = root;
        }
        if (localModule || obj.link) {
          fsExtra.removeSync(desdir);
          fsExtra.ensureSymlinkSync(srcdir, desdir);
        } else {
          if (fs.lstatSync(srcdir).isSymbolicLink()) {
            obj.link = true;
            fsExtra.removeSync(desdir);
            realSrcdir = path.resolve(path.join(path.dirname(srcdir), fs.readlinkSync(srcdir)));
            fsExtra.ensureSymlinkSync(realSrcdir, desdir);
          } else if (fs.lstatSync(root).isSymbolicLink()) {
            obj.link = true;
            fsExtra.removeSync(desdir);
            fsExtra.ensureSymlinkSync(srcdir, desdir);
          } else {
            fsExtra.copySync(srcdir, desdir, {
              dereference: true,
              filter: function(it){
                return !/.+\/node_modules|\/\.git/.exec(it);
              }
            });
          }
        }
        p = Promise.resolve().then(function(){
          return console.log(" -- " + srcdir + " -> " + desdir + " ");
        });
        if (!obj.link && mainFile.js && !localModule) {
          srcFile = path.join(root, mainFile.js);
          desFile = path.join(desdir, "index.js");
          if (!fs.existsSync(desFile)) {
            fsExtra.copySync(srcFile, desFile);
            console.log(" --", "[JS]".green, srcFile + " --> " + desFile + " ");
          }
        }
        if (!obj.link && mainFile.css && !localModule) {
          srcFile = path.join(root, mainFile.css);
          desFile = path.join(desdir, "index.css");
          if (!fs.existsSync(desFile)) {
            fsExtra.copySync(srcFile, desFile);
            console.log(" --", "[CSS]".green, srcFile + " --> " + desFile + " ");
          }
        }
      }
      return p.then(function(){
        fsExtra.removeSync(maindir);
        if (useSymlink) {
          return fsExtra.ensureSymlinkSync(desdir, maindir);
        } else if (fs.lstatSync(desdir).isSymbolicLink()) {
          return fsExtra.copySync(srcdir, maindir);
        } else {
          return fsExtra.copySync(desdir, maindir);
        }
      });
    });
  }
};
cmds.init = {
  command: 'init',
  desc: "initialize `frontendDependencies` field in `package.json`",
  handler: function(argv){
    var json, k;
    json = JSON.parse(fs.readFileSync('package.json').toString());
    if (json.frontendDependencies) {
      return console.log("package.json has already inited. skipped. ");
    } else {
      json.frontendDependencies = {
        root: "web/static/assets/lib",
        modules: Array.from(new Set((function(){
          var results$ = [];
          for (k in json.dependencies) {
            results$.push(k);
          }
          return results$;
        }()).concat((function(){
          var results$ = [];
          for (k in json.devDependencies) {
            results$.push(k);
          }
          return results$;
        }()))))
      };
      fs.writeFileSync("package.json", JSON.stringify(json, null, '  '));
      return console.log("package.json updated.");
    }
  }
};
cmds.publish = {
  command: 'publish',
  desc: 'publish module to npm with specified folder content in root folder',
  builder: function(yargs){
    return yargs.option('dup', {
      type: 'boolean',
      'default': false,
      alias: 'd',
      description: "copy instead move when true. default false"
    }).option('folder', {
      type: 'string',
      'default': 'dist',
      alias: 'f',
      description: "default folder to publish"
    });
  },
  handler: function(argv){
    var srcFolder, workFolder, packageJson, json, files, re, exec;
    srcFolder = argv.f || "dist";
    workFolder = ".fedep/publish";
    if (fs.existsSync(workFolder)) {
      fsExtra.removeSync(workFolder);
    }
    if (!fs.existsSync(srcFolder)) {
      console.error("specified publish folder `" + srcFolder + "` doesn't exist. exit.");
      process.exit();
    }
    fsExtra.ensureDirSync(workFolder);
    fsExtra.copySync(srcFolder, workFolder);
    ['README', 'README.md', 'package.json', 'LICENSE', 'CHANGELOG.md'].map(function(it){
      if (!fs.existsSync(it)) {
        return;
      }
      return fsExtra.copySync(it, path.join(workFolder, it));
    });
    packageJson = path.join(workFolder, "package.json");
    json = JSON.parse(fs.readFileSync(packageJson).toString());
    files = (json.files || []).map(function(item){
      var ret;
      return ret = glob.sync(item);
    }).reduce(function(a, b){
      return a.concat(b);
    }, []);
    if (!argv.d) {
      re = new RegExp("^" + srcFolder);
      files = files.filter(function(it){
        return !re.exec(it);
      });
    }
    files.map(function(f){
      var des;
      des = path.join(workFolder, f);
      fsExtra.ensureDirSync(path.dirname(des));
      console.log(" --", "[COPY]".green, f + " -> " + des);
      return fsExtra.copySync(f, des);
    });
    ['style', 'module', 'main', 'browser', 'unpkg'].map(function(field){
      if (!json[field]) {
        return;
      }
      return json[field] = path.relative(srcFolder, json[field]);
    });
    delete json.files;
    fs.writeFileSync(packageJson, JSON.stringify(json));
    exec = function(cmd){
      return new Promise(function(res, rej){
        var proc;
        proc = child_process.spawn(cmd[0], cmd.slice(1), {
          stdio: 'inherit'
        });
        return proc.on('exit', function(it){
          if (it > 0) {
            return rej(new Error());
          } else {
            return res();
          }
        });
      });
    };
    return exec(['npm', 'publish'].concat([workFolder], ['--access', 'public'])).then(function(){
      return fs.rmSync(workFolder, {
        recursive: true,
        force: true
      });
    });
  }
};
yargs.command(cmds.init).command(cmds.publish).command(cmds['default']).argv;
function import$(obj, src){
  var own = {}.hasOwnProperty;
  for (var key in src) if (own.call(src, key)) obj[key] = src[key];
  return obj;
}
