import axios from "axios";
import dompurify from "dompurify";

function resultHtml(stores){
    return stores.map(store => {
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            <a/>`
    }).join(' ');
}
function typeAhead(search){
    if(!search) return;


    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');


    searchInput.on('input', function(){
        if(!this.value){
            searchResults.style.display = "none";
            return;
        }

        searchResults.style.display = "block";

        axios.get(`http://localhost:7777/api/search?q=${this.value}`)
        .then((response) => {
            const { data } = response;
            if(data.length){
                searchResults.innerHTML = dompurify.sanitize(resultHtml(data));
                return;
            }
            searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found!</div>`)   ;
        })
        .catch(err => console.log(err))
    });
    let a = -1;
    searchInput.on('keyup', function(e){
        if(![38, 40, 13].includes(e.keyCode)) return;

        const href = searchResults.querySelectorAll('.search__result')
        href.forEach((a) => a.style.backgroundColor = "");
        if(e.keyCode == 38){
            if(a > 0) a--;
            href[a].style.backgroundColor = "grey";
        }
        if(e.keyCode == 40){
            if(a < href.length - 1) a++
            href[a].style.backgroundColor = "grey";
        }
        if(e.keyCode == 13){
            if(href[a]) href[a].click();
        }

    })
}

export default typeAhead;