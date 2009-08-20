var twitter = {};

twitter.config = {
  account: {},
  owner: null,
  refresh_interval: 180,
  limit_chars: 140,
  login_callback: null,
  oauth_service_name: 'twitter',
  oauth_popup: {
    options: '',
    on_open: function() {return},
    on_close: window.location.reload
  }
};

twitter.defs = {
  errors: {
    'EMPTY_RESPONSE':       204,
    'NOT_MODIFIED':         304,
    'BAD_REQUEST':          400,
    'NOT_AUTHORIZED':       401,
    'FORBIDDEN':            403,
    'NOT_FOUND':            404,
    'NOT_ACCEPTABLE':       406,
    'INTERNAL_SERVER_ERROR':500,
    'BAD_GATEWAY':          502,
    'SERVICE_UNAVAILABLE':  503
  },
  httpMethod: {
    'GET': 'GET',
    'POST': 'POST',
    'PUT': 'PUT',
    'DELETE': 'DELETE'
  },
  paramType: {
    'ID': 'id',
    'PARAM': 'param'
  },
  authType: {
    'FALSE': 0,
    'TRUE': 1,
    'AUTO': 2
  }
};

twitter.init = function(params, callback) {
  var req = opensocial.newDataRequest();
  req.add(req.newFetchPersonRequest('OWNER'), 'owner');
  req.send(function(response) {
    var owner = response.get('owner');
    if (!owner.hadError()) twitter.config.owner = owner.getData();
    if (typeof callback == 'function') callback();
  });
  twitter.config.account = {};
  if (params.refresh_interval != undefined)
    twitter.config.refresh_interval =  params.refresh_interval;
  if (params.oauth_service_name != undefined)
    twitter.config.oauth_service_name =  params.oauth_service_name;
  if (params.oauth_popup != undefined)
    twitter.config.oauth_popup = params.oauth_popup;
  if (params.login_callback != undefined && typeof params.login_callback == 'function')
    twitter.config.login_callback = params.login_callback;
};

twitter.request = function(url, callback, error_callback, method, authType, opt_params) {
  if (url.indexOf('http', 0) == 0) {
    var request_url = url;
  } else {
    var request_url = 'http://twitter.com'+url;
  }
  var params = {};
  params[gadgets.io.RequestParameters.REFRESH_INTERVAL] = twitter.config.refresh_interval;
  params[gadgets.io.RequestParameters.CONTENT_TYPE] = gadgets.io.ContentType.JSON;
  if ((authType == twitter.defs.authType.AUTO
    && twitter.config.account.screen_name != undefined
    && twitter.config.owner.isViewer() == true)
    || authType == twitter.defs.authType.TRUE) {
    params[gadgets.io.RequestParameters.AUTHORIZATION] = gadgets.io.AuthorizationType.OAUTH;
    params[gadgets.io.RequestParameters.OAUTH_SERVICE_NAME] = twitter.config.oauth_service_name;
  }
  if (method == twitter.defs.httpMethod.POST) {
    params[gadgets.io.RequestParameters.POST_DATA] = gadgets.io.encodeValues(opt_params);
    params[gadgets.io.RequestParameters.METHOD] = twitter.defs.httpMethod.POST;
  } else {
    var query = [];
    for (var key in opt_params) {
      query.push(encodeURIComponent(key)+'='+encodeURIComponent(opt_params[key]));
    };
    request_url = query.length > 0 ? request_url+'?'+query.join('&') : request_url;
    params[gadgets.io.RequestParameters.METHOD] = twitter.defs.httpMethod.GET;
  }
  gadgets.io.makeRequest(request_url, function(response) {
    if (response.oauthApprovalUrl) {
      var popup = new gadgets.oauth.Popup(
        response.oauthApprovalUrl,
        twitter.config.oauth_popup.options,
        twitter.config.oauth_popup.on_open,
        twitter.config.oauth_popup.on_close
      );
      twitter.config.login_callback(popup.createOpenerOnClick());
    } else if (response.oauthErrorText) {
      error_callback(response.oauthErrorText);
    } else if (response.text == undefined) {
      error_callback(twitter.defs.errors.INTERNAL_SERVER_ERROR);
    } else if (response.rc != 200) {
      if (response.data != undefined && response.data.error)
        error_callback(response.data.error)
      else
        error_callback(response.rc);
    } else if (response.text == '') {
      error_callback(twitter.defs.errors.EMPTY_RESPONSE);
    } else {
      callback(response.data);
    }
  }, params);
};

twitter.__prototype = function(url, type, method, authType) {
  if (authType == undefined) 
    var authType = twitter.defs.authType.TRUE;
  if (type == twitter.defs.paramType.ID) {
    return function(id, callback, error_callback) {
      if (id == undefined) return false;
      twitter.request(url+id+'.json', function(data) {
          if (typeof callback == 'function') callback(data);
        },function(response) {
          if (typeof error_callback == 'function') error_callback(response);
        }, method, authType);
    };
  } else {
    return function(params, callback, error_callback) {
      if (params == undefined) params = {};
      twitter.request(url, function(data) {
          if (typeof callback == 'function') callback(data);
        },function(response) {
          if (typeof error_callback == 'function') error_callback(response);
        }, method, authType, params);
    };
  }
};

twitter.search = {
  get: twitter.__prototype(
    'http://search.twitter.com/search.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.FALSE
  )
};

twitter.statuses = {
  public_timeline: twitter.__prototype(
    '/statuses/public_timeline.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.FALSE
  ),
  home_timeline: twitter.__prototype(
    '/statuses/home_timeline.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  friends_timeline: twitter.__prototype(
    '/statuses/friends_timeline.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  user_timeline: twitter.__prototype(
    '/statuses/user_timeline.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.AUTO
  ),
  mentions: twitter.__prototype(
    '/statuses/mentions.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  retweeted_by_me: twitter.__prototype(
    '/statuses/retweeted_by_me.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  retweeted_to_me: twitter.__prototype(
    '/statuses/retweeted_to_me.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  retweets_of_me: twitter.__prototype(
    '/statuses/retweets_of_me.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  show: twitter.__prototype(
    '/statuses/show/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.AUTO
  ),
  update: twitter.__prototype(
    '/statuses/update.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  destroy: twitter.__prototype(
    '/statuses/destroy/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  retweet: twitter.__prototype(
    '/statuses/retweet/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  friends: twitter.__prototype(
    '/statuses/friends.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.FALSE
  ),
  followers: twitter.__prototype(
    '/statuses/followers.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  )
};

twitter.users = {
  show: twitter.__prototype(
    '/users/show.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.AUTO
  )
};

twitter.direct_messages = {
  get: twitter.__prototype(
    '/direct_messages.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  sent: twitter.__prototype(
    '/direct_messages/sent.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  new_: twitter.__prototype(
    '/direct_messages/new.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  destroy: twitter.__prototype(
    '/direct_messages/destroy/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  )
};

twitter.friendships = {
  create: twitter.__prototype(
    '/friendships/create/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  destroy: twitter.__prototype(
    '/friendships/destroy/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  exists: twitter.__prototype(
    '/friendships/exists.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.AUTO
  ),
  show: twitter.__prototype(
    '/friendships/show.json',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.FALSE
  )
};

twitter.friends = {
  ids: twitter.__prototype(
    '/friends/ids.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.FALSE
  )
};

twitter.followers = {
  ids: twitter.__prototype(
    '/followers/ids.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.FALSE
  )
};

twitter.account = {
  verify_credentials: function(params, callback, error_callback) {
    if (params == undefined) params = {};
    twitter.request('/account/verify_credentials.json', function(data) {
      twitter.config.account = data;
      callback(data);
    }, function(response) {
      error_callback(response);
    }, twitter.defs.httpMethod.GET, true, params);
  },
  rate_limit_status: twitter.__prototype(
    '/account/rate_limit_status.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.AUTO
  ),
  end_session: twitter.__prototype(
    '/account/end_session.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  )
};


twitter.favorites = {
  get: twitter.__prototype(
    '/favorites.json',
    twitter.defs.paramType.PARAM,
    twitter.defs.httpMethod.GET,
    twitter.defs.authType.TRUE
  ),
  create: twitter.__prototype(
    '/favorites/create/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  ),
  destroy: twitter.__prototype(
    '/favorites/destroy/',
    twitter.defs.paramType.ID,
    twitter.defs.httpMethod.POST,
    twitter.defs.authType.TRUE
  )
};
