path = "src/pages/UserMenuMobile.jsx"
with open(path, "r") as f:
    src = f.read()

anchor = """<Link to={"/dashboard/store-sellers"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>🏆 Store Rankings</Link>"""

addition = """
          <Link to={"/dashboard/campus-ambassadors"} className='px-3 py-2.5 rounded-lg hover:bg-orange-100'>🎓 Campus Ambassadors</Link>"""

if anchor not in src:
    print("❌ anchor not found verbatim")
elif "campus-ambassadors" in src:
    print("⚠️  already present, skipping")
else:
    src = src.replace(anchor, anchor + addition)
    with open(path, "w") as f:
        f.write(src)
    print("✅ Campus Ambassadors link added to mobile menu")
