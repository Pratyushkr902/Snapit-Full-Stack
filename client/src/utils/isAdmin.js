const isAdmin = (role) => {
    return role?.replace(/['"]/g, '').trim().toUpperCase() === "ADMIN"
}
export default isAdmin