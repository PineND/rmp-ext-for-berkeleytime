// possible functionalities:
// 1. add loading status

let cache = [];
let isUpdating = false
let cur_reddit_link = ''
let cur_rmp_array = [] // array of rmp information for page display
let pending_rmp_array = [] // array of rmp information currently being fetched, prevents multiple concurrent fetches

// example: 'http://localhost:3000'
const proxy = 'http://localhost:3000'

// innitial access to the dynamic component
const dynamic_elements = document.getElementById("root").getElementsByClassName("app")[0].children[1].children[2]

// update the injected button elements with current rmp array
function rmp_information_display() {
  const position = 6

  function rating_indicator(i) {
    if (cur_rmp_array[i].quality > 3.3) {return "🟢 " + cur_rmp_array[i].name}
    if (cur_rmp_array[i].quality > 1.7) {return "🟡 " + cur_rmp_array[i].name}
    return "🔴 " + cur_rmp_array[i].name
  }
  
  function construct_button_name(i) {
    return (
      rating_indicator(i) + "  |  " 
    + cur_rmp_array[i].department + "  |  " 
    + "Rating: " + cur_rmp_array[i].quality + "  |  " 
    + "Ratings count: " + cur_rmp_array[i].rating_count + "  |  " 
    + cur_rmp_array[i].retention + " would take again" + "  |  " 
    + "Difficulty: " + cur_rmp_array[i].difficulty
  )}

  function construct_button(base_content) {
    for (let i = 0; i < cur_rmp_array.length; i++) {
      const button = document.createElement('button');
      button.textContent = construct_button_name(i);
      button.classList.add('rmp-button');
      button.onclick = function() {window.open(cur_rmp_array[i].direct_link)}
      base_content.appendChild(button);
    }
  }

  const existing_injected_element = document.getElementById('rmp_injected')
  if (existing_injected_element) {
    existing_injected_element.innerHTML = ""
    construct_button(existing_injected_element)
    return
  }

  const injected_element = document.createElement('div');
  injected_element.id = 'rmp_injected';
  if (dynamic_elements.children.length >= position) {
    dynamic_elements.insertBefore(injected_element, dynamic_elements.children[position]);
  }
  construct_button(injected_element)
}

// fetch rmp information for given name input, update global cur_rmp_array
function fetch_rmp_information(name) {
  let startTime = performance.now();
  const rmp_connection = 'https://www.ratemyprofessors.com/search/professors/1072?q='
  const url = rmp_connection + name.replace(/ /g, '%20')
  
  // Check if the data is already in cache
  const cachedData = cache.find(item => item.url === url);
  if (cachedData) {
    cur_rmp_array.push(cachedData);
    rmp_information_display()
    return;
  }

  if (pending_rmp_array.includes(name)) {
    return;
  }
  pending_rmp_array.push(name)

  console.log("Fetching information: " + name)

  const proffessor_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a/div/div[2]/div[1]"
  const department_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a/div/div[2]/div[2]/div[1]"
  const quality_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a/div/div[1]/div/div[2]"
  const rating_count_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a/div/div[1]/div/div[3]"
  const retention_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a/div/div[2]/div[3]/div[1]/div"
  const difficulty_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a/div/div[2]/div[3]/div[3]"
  const prof_id_xpath = "/html/body/div[2]/div/div/div[3]/div[1]/div[1]/div[4]/a[1]"

  fetch(proxy + '/fetch?url=' + encodeURIComponent(url))
  .then(response => {
    if (!response.ok) { throw new Error('Network response was not ok'); }
    return response.text();
  })
  .then(htmlString => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    function get_element(xpath) {
      const element = document.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return element ? element.textContent.trim() : "Not found";
    }

    const professor = get_element(proffessor_xpath);

    if (professor.split(" ")[1].toUpperCase() !== name.split(" ")[0].toUpperCase()) {
      console.log("No matching entry found for " + name)
    }
    else {
      const department = get_element(department_xpath);
      const quality = get_element(quality_xpath);
      const rating_count_unformatted = get_element(rating_count_xpath);
      const retention = get_element(retention_xpath);
      const difficulty_unformatted = get_element(difficulty_xpath);
      const rating_count = rating_count_unformatted !== "Not found" ? rating_count_unformatted.split(" ")[0] : "Not found";
      const difficulty = difficulty_unformatted !== "Not found" ? difficulty_unformatted.split(" ")[0] : "Not found";

      const prof_id_unformatted = document.evaluate(prof_id_xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const parser = new DOMParser();
      const prof_id = 
        parser
          .parseFromString(prof_id_unformatted.outerHTML, "text/html")
          .querySelector('a')
          .getAttribute('href')
          .match(/\d+$/)[0]
      const direct_link_to_prof = "https://www.ratemyprofessors.com/professor/" + prof_id

      const joined_information = {
        name: professor, 
        department: department, 
        quality: quality, 
        rating_count: rating_count, 
        retention: retention, 
        difficulty: difficulty,
        url: url,
        direct_link: direct_link_to_prof
      }
      cache.push(joined_information)
      cur_rmp_array.push(joined_information)
      rmp_information_display()
    }
    const index = pending_rmp_array.indexOf(name);
    if (index > -1) {pending_rmp_array.splice(index, 1)}

    let endTime = performance.now()
    let timeTaken = (endTime - startTime) / 1000
    console.log(`Execution time for ${name}: ${timeTaken.toFixed(3)} seconds`)
  })
  .catch(error => {
    console.error('Error fetching data:', error)
  })
}

// get useful content from static copy of dynamic component
function extract_content_func(base_content) {
  const content =
  base_content
    .getElementsByClassName("table-container description-section")[0]
    .getElementsByClassName("table table")[0]
    .querySelector('tbody')
    .querySelectorAll('tr')
  return content
} 

// create array of prof names for a given course
function create_array(base_content) {
  const nameArray = []
  for (let i = 0; i < base_content.length; i++) {
    const singular_content = 
      base_content[i]
      .children[2]
      .textContent
    if (singular_content) {
      if (singular_content.includes(",")) {
        const compound_content = 
          singular_content.split(',').map(item => item.trim())
        nameArray.push(...compound_content)
      }
      else { 
        nameArray.push(singular_content)
      }
    }
  }
  unique_nameArray = [...new Set(nameArray)]
  return unique_nameArray
}

// reformat name from berkeleytime, pass name into fetch_rmp_information, reset global cur_rmp_array
function extract_rmp_func(base_content) {
  function formatName(name) {
    return name
      .toLowerCase().split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  const formatted_name = base_content.map(formatName)
  cur_rmp_array = []
  const existing_injected_element = document.getElementById('rmp_injected')
  if (existing_injected_element) {
    existing_injected_element.innerHTML = ""
  }
  formatted_name.map(fetch_rmp_information)
}

// trigger when DOM changes
function onChange() {
  if (isUpdating) return
  observer.disconnect()
  isUpdating = true

  const static_copy = dynamic_elements.cloneNode(true)
  try {
    const extract_content = extract_content_func(static_copy)
    const name_array = create_array(extract_content)
    extract_rmp_func(name_array)
  }
  catch {null}

  isUpdating = false
  observer.observe(
    dynamic_elements, { 
      childList: true, 
      subtree: true 
    }
  )
}

const observer = new MutationObserver(onChange)
observer.observe(
  dynamic_elements, { 
    childList: true, 
    subtree: true 
  }
)