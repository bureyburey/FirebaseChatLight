var markdown = {
    // Michael Ermishin's Markdown module
    htmlEntitiesMap: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        ' ': '&nbsp;'
    },    
    specToEntities: function(text) {
    if(text[0]==="$"){return text;}
        var pattern = new RegExp('[' + Object.keys(this.htmlEntitiesMap).join('') + ']', 'g');
        //return text.replace(pattern, k => this.htmlEntitiesMap[k]);
        return text.replace(pattern, function (m) {
            return markdown.htmlEntitiesMap[m];
        });
    },
    entitiesToSpec: function(text) {
        var entToSpecMap = Object.keys(this.htmlEntitiesMap).reduce(function(obj, key) {
            obj[markdown.htmlEntitiesMap[key]] = key;
            return obj;
        }, {});

        var pattern = new RegExp(Object.keys(entToSpecMap).join('|'), 'g');
        return text.replace(pattern, function (m) {
            return entToSpecMap[m];
        });
        //return text.replace(pattern, k => entToSpecMap[k]);
    }
};

Number.prototype.pad = function (n,str){
        return Array(n-String(this).length+1).join(str||'0')+this;
}

function timeToDateString(time,sep){
        // converts time from integer to HH:MM:ss - DD/MM/YYYY format
        sep=sep || " - ";
        var date = new Date(time);
        var dateString = (date.getHours().pad(2)+":"+date.getMinutes().pad(2)+":"+date.getSeconds().pad(2)+sep+date.getDate()+"/"+(date.getMonth()+1)+"/"+(date.getYear()+1900));
        return dateString;
}

function start(){
    toastr.options={
        "positionClass": "toast-top-left"
    }
    // find elements in the HTML page
    with(document){
        var night_mode=getElementById("night_mode");
        var chat_login=getElementById("chat_login");
        var input_username=getElementById("input_username");
        var btn_login=getElementById("btn_login");
        var btn_logout=getElementById("btn_logout");
        var btn_online=getElementById("btn_online");
        var post_controls=getElementById("post_controls");
        var input_by=getElementById("input_by");
        var input_body=getElementById("input_body");
        var btn_post=getElementById("btn_post");
        var btn_update=getElementById("btn_update");
        var emoji_container=getElementById("emoji_container");
        var messages=getElementById("messages");
        var loader=getElementById("loader");
    }
    
    // our firebase reference variables
    var db_ref=null;
    var posts_ref=null;
    var am_online=null;
    var user_ref=null;
    var id_buffer=null;
    var username=null;
    // our posts list
    var posts=[];
    var online_users=[];
    var numUsers=0;
    var previous=0;
    var numPosts=0;
    var MAX_MSGS=50;
    var nightModeOn=false;
    init_firebase();
    
    night_mode.onclick=function(){
        return;
        nightModeOn=!nightModeOn;
        if(nightModeOn){
            textColor="white";
            backGroundColor="black";
            document.body.style.backgroundColor="grey";
            
        }else{
            textColor="black";
            backGroundColor="white";
            document.body.style.backgroundColor="lightblue";
        }
        var i,tags = document.getElementById("app").getElementsByTagName("*"),total = tags.length;
        for ( i = 0; i < total; i++ ) {
            tags[i].style.color = textColor;
            tags[i].style.backgroundColor = backGroundColor;
        }
    }
    
    btn_login.onclick=function(evt){
    
        if(input_username.value.length===0){
           toastr.error("Please enter user name!");
           return;
        }
        if(input_username.value.length>20){
           toastr.error("User name cannot be longer than 20 letters!");
           return;
        }

       login();
       refreshUI(posts);
    }
    btn_logout.onclick=function(){
        logout();
    }
    btn_online.onclick=function(){
        users="";
        for(i=0;i<online_users.length;i++){
           users+=online_users[i].name+" since "+timeToDateString(online_users[i].time)+"\n"; 
        }
       alert(users);
    }
    // post submit handler
    btn_post.onclick=function(){
       if(input_by.value.length===0 || input_body.value.length === 0){
          toastr.error("Message body cannot be empty!");
          return;
       }
       // retreive author and post body from HTML fields
       post_data={
          author:input_by.value,
          body:input_body.value 
       };
       create_post(post_data);
    }
    
    btn_update.onclick=function(){
        switch_elements(btn_post,btn_update);
        // apply the changes to the database
        posts_ref.child(id_buffer).update({
           body:input_body.value 
        });
  
        id_buffer=null;
        input_body.value="";
        restoreScroll();
    }
    
    function login(){
    
    switch_elements(btn_logout,btn_login);
        switch_elements(post_controls,chat_login);
        input_by.value=input_username.value;
        username=input_username.value;
        
        am_online = db_ref.ref('.info/connected');
        user_ref = firebase.database().ref('/connected/' + input_username.value);
        // create listener when new user is logged in
        
            am_online.on('value', function(snapshot) {
                if (!snapshot.val()) return;
                user_ref.onDisconnect().remove();
                user_ref.set(firebase.database.ServerValue.TIMESTAMP);
            }); 
    }
    
    function logout(){
        switch_elements(btn_login, btn_logout);
        switch_elements(chat_login,post_controls);
        input_by.value="";
        user_ref.remove();
    }
    
    function init_firebase(){
        // force web sockets to prevent XMLHttpRequest warning
        firebase.database.INTERNAL.forceWebSockets();
        // access our database
        db_ref=firebase.database();
        // access posts child in our database
        posts_ref=db_ref.ref("posts");
       
       // attach a listener for database changes events
       // on.("value",.....) means that every time a value inside posts is added/changed/deleted the getAllMessages function will be fired, receiving the latest snapshot from the server
        posts_ref.orderByChild("createTime").on("value", getAllMessages, onError);
        
      db_ref.ref('connected').on('value', function(snapshot) {
                online_users = [];
                snapshot.forEach(function(child){
                online_users.push({
                    name: child.key,
                    time: child.val()
                })});
    
                btn_online.innerHTML="Online Users: "+online_users.length;

if(online_users.length>numUsers){
// sort the online users list by login time
online_users.sort(function(a,b){return b.time-a.time})

// display toastr of last user joined
    toastr.info("User "+online_users[0].name+" Joined!");
}
numUsers=online_users.length;
            });
    }
    
    function onError(err){
        console.log("Firebase 'on' error: "+err);
    }
    
    function switch_elements(toShow, toHide){
       toShow.style.display="inline-block";
       toHide.style.display="none";
    }
    
    function getAllMessages(snapshot){
    // load all messages from the snapshot
        posts=[];
        // snapshot object holds updated data from the firebase server, and we need to extract it, notice that we access each field name as by child.val().<fieldName> when <fieldName> corresponds with the fields that were created in the create_post method
        
        snapshot.forEach(function(child) {
            posts.push({
                id:child.key,
                author: markdown.specToEntities(child.val().author),
                body:markdown.specToEntities(child.val().body),
                createTime: child.val().createTime
            });
        });
        if(posts.length>0){
        // if there are posts, refresh the UI
           refreshUI(posts);
        }
    }
    
    this.create_post=function(data){
    // push a new post to posts reference variable with the following fields: author, body, createTime
         try{
            posts_ref.push({
                author: data.author,
                body: data.body,
                createTime: firebase.database.ServerValue.TIMESTAMP
            });
        }catch(err){ console.log(err); }
        input_body.value="";
    }
    
    this.update_post=function(el){
    
        data=extractPostData(el);
        
        if(markdown.entitiesToSpec(data.author)!==markdown.entitiesToSpec(input_by.value)){
           toastr.error("Can only edit your own posts!");
           return;
        }
    input_body.value= markdown.entitiesToSpec(data.body);
    switch_elements(btn_update,btn_post);
    // load the post id to the global id_buffer and wait for confirmation (click on Update Post button)
    id_buffer=data.id;
    saveAndScroll();
    };
    
    this.delete_post=function(el){
    
        data=extractPostData(el);
        
        if(markdown.entitiesToSpec(data.author)!==markdown.entitiesToSpec(input_by.value)){
        // verify author name against input field (very very very minimal authentication, but good enough for this example)
           toastr.error("Can only delete your own posts!");
           return;
        }
        
        if(confirm("Delete Message!")){
           // delete the post with appropriate id from the database
            posts_ref.child(data.id).remove();
            switch_elements(btn_post,btn_update);
            input_body.value="";
        }
    };
    
    this.appendText=function(el){
        input_body.value+=markdown.entitiesToSpec(el.innerHTML);
    }
    
    function extractPostData(el){
        // extract post id from the element
        id=el.parentNode.id;
       
       // extract author name from the element in @{authorName} format
        author=el.parentNode.parentNode.childNodes[0].innerHTML;
       // isolate only the authorName
  author=author.substring(2,author.length-1);
      // extract message body
       body=el.parentNode.parentNode.childNodes[4].childNodes[0].innerHTML;  
        return {
            id: id,
            author: author,
            body: body
        };
    }

    function saveAndScroll(){
       previous=window.pageYOffset;
       window.scrollTo(0,0);
    }

    function restoreScroll(){
        window.scrollTo(0,previous);
    }
    
    function formMessage(message) {
    // create a message element
            var html = '<div lang="eng" class="message_details">';
            html += '<span class="message_author" onclick="appendText(this)" value="'+message.author+'">@{' + message.author + '}</span>';
            if(markdown.entitiesToSpec(input_by.value)===markdown.entitiesToSpec(message.author)){
            html += '<span class="user_controls" id="' + message.id + '">';
            html += '<span class="user_control" name="edit_message" onclick="update_post(this)">&#x270F;</span>';
                html += '<span class="user_control" name="delete_message" onclick="delete_post(this)">❌</span>';
            
            html += '</span>';
            }
            // trashcan &#x1f5d1;
            var formated_time = timeToDateString(new Date(message.createTime));
            html += ' <span class="message_time"></br>at ' + formated_time + '</span>';
            html += '<div class="message_body" value="'+message.body+'"><pre>' + message.body + "</pre></div>";
            html+="</div>";

            return html;
        }
    
    function refreshUI(list){
        // clears and re-populates the posts
        // clear the innerHTML of the messages div
        
        loader.style.display="block";
        messages.innerHTML="";
        // add posts
        var limit=MAX_MSGS;
        for(i = list.length-1; i >= 0; i--){
            messages.innerHTML+=formMessage(list[i]);
            limit--;
            if(limit===0){
               break; 
            }
        }
        loader.style.display="none";
        
        if(numPosts<list.length && numPosts>0 && list[list.length-1].author!==input_by.value){
        // retreive last post and display it in a toastr (if condition checks for new posts only by comparing amount of posts from last update)
            lastPost=list[list.length-1];
            toastr.success(lastPost.author+" Posted: "+lastPost.body);
        }
        // update number of posts retreived
        numPosts=list.length;
    }
    (function loadEmojis(){
       emojis=["👍","👎","😬","😱","🤔","😲","🍪","🍩","🍿"];
       for(i=0;i<emojis.length;i++){
          html="<span onclick=appendText(this)>"+emojis[i]+"</span>";
          emoji_container.innerHTML+=html;
          }
    }());
}

window.onload=start;
