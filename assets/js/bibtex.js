// An object BibTexEntry and BibTexEntries
// Copyright (c) 2005 Frank Dellaert

//===============================================================
// Utilities
//===============================================================

var bibtex = {}

// create an error DIV out of html text
bibtex.error = function(html) {
  return "<div class=\"bibtexError\">" + html + "</div>"
}

// debugging in document
bibtex.debug = function(str) {
  document.write(bibtex.error(str));
}

// debugging in document
bibtex.inspect = function(obj) {
  for (i in obj) bibtex.debug(i)
    }

// trim whitespace on left and right
// from http://www.js-examples.com/javascript/?view=1022
bibtex.trim1 = function(str) {
  var pattern=/^\s*(\S.*\S)\s*$/;
  var a=pattern.exec(str);
  var result = str;
  if (a) result=a[1];
  return result;
}

// trim whitespace and delimiters from string
bibtex.trim = function(str) {
  
  // trim {} or ""
  function trim2(str)
  {
    str = str.replace(/{/g,"");
    str = str.replace(/}/g,"");
    str = str.replace(/\s+/g," ");
    var pattern=/^.*\"(.*)\".*$/;
    var a=pattern.exec(str);
    var result = str;
    if (a) result=a[1];
    return result;
  }
  
  return trim2(bibtex.trim1(str));
}

//===============================================================
// BibTexEntry object
//===============================================================

// constructor
function BibTexEntry(text) {
  
  if (!text) throw ("BibTexEntry: empty text");
  
  // store original text
  this.text = text;
  
  // get type and text between braces
  var i = text.indexOf('{');
  if (i == -1) throw ("BibTexEntry: no { delimiter");
  var j = text.lastIndexOf('}');
  if (j == -1) throw ("BibTexEntry: no } delimiter");
  
  this.type = text.slice(1,i);
  var inner = text.slice(i+1,j);
  // split inner into pairs
  var pairs = inner.split(',');
  
  // get the key and drop it from pairs
  this.key = pairs[0];
  if (!this.key) throw ("BibTexEntry: no key");
  
  // now loop over the remaining pairs
  this.nrPairs = pairs.length;
  for (var k in pairs) {
    if (k==0) continue; // key
    var pair = pairs[k];
    if (pair.length>2) { // to get rid of whitespace fields, fix !
      var keyvalue = pair.split('=');
      if (keyvalue.length<2) throw ("BibTexEntry: invalid key-value pair: [" + pair + "]");
      // Special exception for scriipt arguments
      if (keyvalue.length==3) keyvalue[1] = keyvalue[1].concat("=",keyvalue[2]);
      if (keyvalue.length>3) throw ("BibTexEntry: invalid key-value pair: [" + pair + "]");
      var key = bibtex.trim(keyvalue[0]).toLowerCase();
      var val = bibtex.trim(keyvalue[1]);
      this[key]=val;
    }
    else {
      this.nrPairs = this.nrPairs - 1;
    }
  }
  
  // Validate: should be automated with required fields per type
  switch (this.type) {
    case "Person":
      if (!this.name) throw "BibTexEntry: Person has no name";
      break;
  }
}

// render as string
BibTexEntry.prototype.toString = function() { return this.text }

// render as a list
BibTexEntry.prototype.toList = function()
{
  var string = "<ul>";
  string += "<li>type : " + this.type;
  string += "<li>key  : " + this.key;
  string += "<li>author : " + this.author;
  string += "<li>year   : " + this.year;
  string += "<li>title  : " + this.title;
  switch (this.type) {
    case "Article":
      string += "<li>journal : " + this.journal;
      break;
    case "InProceedings":
    case "InCollection":
      string += "<li>booktitle : " + this.booktitle;
      break;
    case "TechReport":
      string += "<li>institution : " + this.institution;
      string += "<li>number      : " + this.number;
      break;
  }
  return string + "</ul>";
}

// render as HTML
BibTexEntry.prototype.render = function(database)
{
  var string = "<span class=" + this.type + ">";
  
  function expand(author) {
    author=bibtex.trim1(author);
    if (!database)
      string += span("author",author);
    else {
      var key = database.lookupPerson(author);
      if (!key)
        string += span("author",author);
      else
        string += database.entry(key).render();
    }
  }
  
  function span(id,str) { return "<span class=\"" + id + "\">" + str + "</span>"}
  
  function link(cls,url,text) {
    return "<a class=\""+cls+"\" href=" + url + ">" + text + "</a>"
  }
  
  function renderTitleAuthors(entry) {
    // title and URL
    if (entry.url)
      string += link("title",entry.url,entry.title);
    else
      string += span("title",entry.title);
    
    // authors
    string += ", ";
    var authors = entry.author.split(" and ");
    var nrAuthors = authors.length;
    expand(authors[0]);
    if (nrAuthors==2) {
      string += " and "; expand(authors[1]);
    }
    else {
      for (var i=1; i < nrAuthors; i++) {
        if (i==nrAuthors-1) {string += ", and "} else {string += ", "}
        expand(authors[i])
      }
    }
  };
  
  // lookup a value in the database and render it with URL if applicable
  function lookup(entry,database,field) {
    var value = entry[field];
    try {
      var entry = database.entry(value);
      str = entry.name;
      if (entry.url)
        string += ", " + link(field,entry.url,str);
      else
        string += ", " + span(field,str);
    }
    catch (err) {
      string += ", " + span(field,value);
    }
  }
  
  switch (this.type) {
    case "Person":
      // name and URL
      var str;
      if (this.url)
        str = link("author", this.url, this.name);
      else
        str = span("author",this.name);
      string += "<span id=\""+this.key+"\">" + str + "</span>";
      break;
    case "Article":
      renderTitleAuthors (this);
      lookup(this,database,"journal");
      string += ", " + span("year",this.year);
      break;
    case "InProceedings":
    case "InCollection":
      renderTitleAuthors (this);
      lookup(this,database,"booktitle");
      string += ", " + span("year",this.year);
      break;
    case "TechReport":
      renderTitleAuthors (this);
      lookup(this,database,"institution");
      string += ", " + span("number",this.number);
      string += ", " + span("year",this.year);
      break;
  }
  return string + "</span>";
}

//===============================================================
// Database Object
//===============================================================

// create a list of entries from possibly empty strings
function Database(strings) {
  // Initialize some stuff
  this.nrEntries=0;
  this.entries={}; // BibTex entries
  this.person={};  // People
  
  // Now loop over the entries
  for (var i in strings) {
    var text = strings[i];
    if (text) {
      try {
        var entry = new BibTexEntry('@'+text);
        this.entries[entry.key] = entry;
        this.nrEntries++;
        if (entry.type == "Person")
          this.person[entry.name] = entry.key;
      }
      catch (err) {bibtex.debug(err)}
    }
  }
}

// Create database from a string
function DatabaseFromString(str) {
  var strings = str.split('@');
  return new Database(strings);
}

// retrieve an entry with a given key
Database.prototype.entry = function(key) {
  var entry = this.entries[key];
  if (entry) return entry; else throw "Database.entry: unknown BibTex key: " + key
    }

// retrieve key of a person, undefined if not found.
Database.prototype.lookupPerson = function(name) {
  return this.person[name]; // todo: get rid of warning
}

// render an entry with a given key to html
Database.prototype.render = function(key) {
  var entry = this.entry(key);
  return entry.render(this)
}

// default compare for sort: reverse chronological
function reverseChronological (d) {
  return function (a,b) {
    var x = d.entry(a).year;
    var y = d.entry(b).year;
    return ((x > y) ? -1 : ((x < y) ? 1 : 0));
  }
}

// return an array of keys that match a regex in a given field. If the
// field is not given, the regex will be matched in the text field.
Database.prototype.search = function(regex, fieldName, keys, compare) {
  if (!fieldName) fieldName="text";
  fieldName = fieldName.toLowerCase();
  var result=[];
  if (!keys) {
    keys=[];
    for (var key in this.entries) {
      keys[keys.length]=key; // push does not work on all browsers
    }
  }
  for(var i in keys) {
    var key_i = keys[i];
    var entry = this.entry(key_i);
    try {
      var field = entry[fieldName];
      if (field.search(regex) != -1) result[result.length] = entry.key;
    }
    catch (err) { /* don't do anything */ }
  }
  
  if (compare) return result.sort(compare(this));
  else return result.sort(reverseChronological(this));
}

// search from a "[field:]regex" string
Database.prototype.searchQuery = function(query,keys) {
  if (!query) throw "Database.searchQuery: empty search string";
  var parts = query.split(':');
  var field, regex;
  switch(parts.length) {
    case 1:
      field = "text";
      regex = new RegExp(parts[0],"m");
      break;
    case 2:
      field = bibtex.trim1(parts[0]);
      try {
        regex = new RegExp(parts[1],"m");
      }
      catch (err) {
        regex = new RegExp(parts[1]); // m flag not supported in IE-Mac
      }
      break;
    otherwise:
      throw "Database.searchQuery: malformed query";
  }
  return this.search(regex,field,keys);
}

// search from a conjunctive "query [query...]" string
Database.prototype.search3 = function(str) {
  if (!str) throw "Database.search3: empty search string";
  var queries = str.split(' ');
  var keys;
  for(var i in queries) {
    keys = this.searchQuery(queries[i],keys);
  }
  return keys;
}

// render all keys in a key array to a list of <LI> items
Database.prototype.keysToList = function(keys) {
  var string = "";
  for (var i in keys) {
    try {
      string += "<li>" + this.render(keys[i]) + "</li>";
    }
    catch (err) {
      string += "<li>" + bibtex.error("Entry \"" + keys[i] + "\": " + err) + "</li>";
    }
  }
  return string
}

// render all keys as an unordered list
Database.prototype.keysToUL = function(keys) {
  return "<UL>\n"+this.keysToList(keys)+"</UL\n"
}

//===============================================================
// Database, DOM-Specific
//===============================================================

// Function to get text of an element that supports as many browsers
// as possible
function getTagText(node) {
  if (node.textContent)
    return node.textContent;
  else if (node.innerText)
    return node.innerText;
  else if (node.childNodes[0])
    return node.childNodes[0].nodeValue;
  else
    throw "browser not supported";
}

// Function to set the inner HTML of an element that supports as many
// browsers as possible
function setTagHTML(node,html) {
  if (node.innerHTML)
    return node.innerHTML=html;
  else
    throw "browser not supported";
}

// Get bibtex element and load into database
// Assumes bibtex file included as <pre id="bibtex">file here</pre>
var DatabaseFromDocument = function() {
  var element = document.getElementById("bibtex");
  return DatabaseFromString(getTagText(element));
}

// replace all references by a rendered version
Database.prototype.replacePubs = function() {
  var tags = document.getElementsByName("pub");
  for(var i=0; i<tags.length; i++) {
    var element = tags[i];
    setTagHTML(element, this.render(getTagText(tags[i])));
  }
}

// search and render all keys as a list
Database.prototype.searchToUL = function(regex,field) {
  document.write(this.keysToUL(this.search(regex,field)));
}

var debug=false;

// replace all searches by by a rendered version
Database.prototype.replaceSearches = function() {
  var tags = document.getElementsByName("search");
  for(var i=0; i<tags.length; i++) {
    var element = tags[i];
    var str = getTagText(element);
    try {
      if (!str) throw "no search string";
      var keys = this.search3(str);
      if (keys.length==0) throw "no matches";
      if (debug) element.textContent = this.keysToList(keys);
      else setTagHTML(element,this.keysToList(keys));
    }
    catch (err) {
      setTagHTML(element,bibtex.error("Search \"" + str + "\": " + err));
    }
  }
}

var xmlhttp;

// Load a specified bibtex file and replace all pub and search tags
function getHTTP(url,callback) {
  // code for Mozilla, etc.
  if (window.XMLHttpRequest) {
    xmlhttp=new XMLHttpRequest();
    xmlhttp.onreadystatechange=callback;
    xmlhttp.open("GET",url,true);
    xmlhttp.send(null);
  }
  // code for IE
  else if (window.ActiveXObject) {
    xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    if (!xmlhttp) throw "Could not access ActiveX object";
    xmlhttp.onreadystatechange=callback;
    xmlhttp.open("GET",url,true);
    xmlhttp.send();
  }
  else throw "Browser does not support reading files";
}

// Run when successfully loaded bibtex file
function alertContents() {
  if (xmlhttp.readyState == 4) {
    var str = xmlhttp.responseText;
    // create bibtex database from the string containing the entire file
    var database = DatabaseFromString(str);
    // Now replace the HTML entries with content generated from the database
    database.replacePubs();
    database.replaceSearches();
  }
}

// Load a specified bibtex file and replace all pub and search tags
function load(url) {
  try {
    // Load the bibtex file and if success, call "alertContents"
    getHTTP(url,alertContents);
  } catch (err) {
    bibtex.error("There seemed to have been an error loading the bibtex file:<br>" + err);
  }
}
