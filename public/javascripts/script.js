
    function addToCart(proId){
        $.ajax({
        url:'/add-to-cart/'+proId,
        method:'get',
        success:(response)=>{
            alert(response)
            //ith complete akan und count increase akunath oke miss ayathakum
        }
        })
    }