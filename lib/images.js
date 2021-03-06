

module.exports = function (dolphin) {
  var opts = dolphin.opts;

  /**
   *
   * filters – a JSON encoded value of the filters (a map[string][]string) to process on the images list. Available filters:
      dangling=true
      label=key or label="key=value" of an image label
      before=(<image-name>[:<tag>], <image id> or <image@digest>)
      since=(<image-name>[:<tag>], <image id> or <image@digest>)
   **/
  var images = function (imageName) {
    //return dolphin._list('images', filters, opts);
    return dolphin._get('images/' + imageName + '/json', null, opts);
  }

  /**
   * 
   * @param {string} url 
   * @param {string} name 
   * @param {string[]} [versions] 
   * @param {{Labels?: object; buildargs?: object; }} [params] 
   * @returns {Promise<{ Id: string }>}
   */
  images.build = function (url, name, versions = [], params = {}) {
    if (typeof url !== 'string') {
      throw new Error('url needs to be a string');
    }

    if (typeof name !== 'string') {
      throw new Error('name needs to be a string');
    }

    if(versions && !Array.isArray(versions)) {
      throw new Error('versions needs to be an array');
    }

    const args = ['build'];

    if (versions && versions.length > 0) {
      for (const version of versions) {
        args.push('-t', `${name}:${version}`);
      }
    } else {
      // do not use any versions but still use tag
      args.push('-t', name);
    }

    if (params) {
      if(typeof params !== 'object') {
        throw new Error('params needs to be an object');
      }
      
      for (const param of [
        { key: 'Labels', arg: '--label' },
        { key: 'buildargs', arg: '--build-arg' }
      ]) {
        const obj = params[param.key];

        if (obj && typeof obj === 'object') {
          Object
            .keys(obj)
            .forEach(key => {
              args.push(param.arg, `${key}=${obj[key]}`);
            });
        }
      }
    }

    args.push('-q')
    args.push(url);

    // We use docker command line since building images is quite a complex operation.
    return dolphin.cmd(args).then(({ stdout }) => {
      return {
        Id: stdout.trim()
      };
    });
  }

  images.push = function (image, tag) {
    var url = 'images/' + image + '/push';
    if (tag) {
      url += '?tag=' + tag;
    }
    return dolphin._post(url, null, opts);
  }

  images.tag = function (nameOrId, repo, tag) {
    var url = 'images/' + nameOrId + '/tag?repo=' + repo;
    if (tag) {
      url += '&tag=' + tag;
    }
    return dolphin._post(url, null, opts);
  }

  //
  // TODO: registry auth.
  // TODO: default registries, etc.
  //
  var request = require('request');
  images.manifest = function (name, tag) {
    return new Promise(function (resolve, reject) {
      var splitted = name.split('/');
      if (splitted.length > 1) {
        var registry = splitted[0];
        var repo = splitted[1];
        var opts = {
          url: 'https://' + registry + '/v2/' + repo + '/manifests/' + tag,
          method: 'GET',
          json: true,
        }

        request(opts, function (err, response, body) {
          if (err) return reject(err);
          resolve(body);
        });
      } else {
        resolve();
      }
    });
  }

  return images;
}
