import cheerio from 'cheerio';
import URI from 'urijs';

import utils from './utils';
import linkSpider from './linkSpider';
import request from './request';


class Cssh {
  
  
  getShallowText(elements) {
    
    let retVal = []
    elements.forEach(function(element){
      
      if (element.type !== 'text') {
        return;
      }
      
      let text = element.data.trim()
      if (text.length > 0) {
        retVal.push(text)  
      }
    })
    return retVal
  }
  
  
  parseDetailpage(url, resp) {
    
    let obj = {}
    
    obj.url = url
    
    const $ = cheerio.load(resp.body);
    
    
    obj.name = $('#lightbox-container > div.col-lg-3.col-md-3.col-sm-6.fac-single > h1').text().trim()
    
    
    obj.image = $('#lightbox-container > div.col-lg-3.col-md-3.col-sm-6.fac-single > img.headshot').attr('src').trim()
    
    // Job Title
    // "Assistant Professor Sociology and Health Science"
    obj.title = $('#lightbox-container > div.col-lg-3.col-md-3.col-sm-6.fac-single > div.fac-single-title').text().trim()
    
    // Parse out the email. Parse both the email it is linked to and the email that is displayed to ensure they are the same
    let emailElements = $('#lightbox-container > div.col-lg-3.col-md-3.col-sm-6.fac-single > p > a')
    
    let mailto = utils.standardizeEmail(emailElements.attr('href'))
    let email = utils.standardizeEmail(emailElements.text().trim())
    if ((mailto || email) && mailto !== email) {
      console.log('Warning; mailto !== email, skipping', mailto, email)
    }
    else if (mailto === email && email) {
      obj.email = email;
    }
    
    
    // Phone number and office location are just both in a <p> element separated by <br>. 
    // Dump all the text and then figure out where the phone and office is. 
    let descriptionElements = $('#main div.pagecenter div.gdcenter div.col16 > div.col5 > p.smallp')[0].children
    
    let texts = this.getShallowText(descriptionElements)
    
    let phone = null;
    texts.forEach(function(text){
      text = text.trim()
      let possiblePhone = utils.standardizePhone(text)
      if (possiblePhone) {
        if (obj.phone) {
          console.log('duplicate phone??', obj.phone, possiblePhone)
        }
        
        obj.phone = possiblePhone  
      }
      
      // Might be office
      else if (text.length > 6) {
        if (obj.office) {
          console.log('dup office???', obj.office, text)
        }
        if (text.startsWith('Office: ')) {
          text = text.slice('Office: '.length)
        }
        obj.office = text
      }
      else {
        console.log('Warn: unknown prop in description', text)
      }
    })
    
    return obj;
  }
  
  
  
  async main() {
    https://www.northeastern.edu/cssh/faculty
    let startingLinks = ['https://www.northeastern.edu/cssh/faculty']
    
    
    let urls = await linkSpider.main(startingLinks)
    
    let profileUrls = []
    
    // Filter all the urls found to just profile urls
    //  'https://www.northeastern.edu/cssh/faculty/noemi-daniel-voionmaa',
    urls.forEach(function(url){
      if (url.match(/https:\/\/www.northeastern.edu\/cssh\/faculty\/[\d\w-]+\/?/i)) {
        profileUrls.push(url)
      }
    })
    
    
    let promises = []
    
    profileUrls.forEach((url) => {
      promises.push(request.get(url).then((response) => {
        return this.parseDetailpage(url, response)
      }))
    })
    
    let people = await Promise.all(promises)
    
    return people;
    
  }
  
}



const instance = new Cssh()

instance.main()

export default instance;