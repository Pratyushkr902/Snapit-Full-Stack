const isAdmin = (role) => {
    const normalized = role?.replace(/['"]/g, '').trim().toUpperCase()
    return normalized === "ADMIN" || normalized === "SUPER_ADMIN"
}
export default isAdmin