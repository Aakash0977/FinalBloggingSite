const authPage = (permissions) =>{
    return (req, res, next) =>{
        const userRole = req.body.is_admin
        if (permissions.includes(userRole)){
            next();
        }else{
            return ("no permissions" );
        }
    }
}
