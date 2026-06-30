import React, { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native'
import { useSelector } from 'react-redux'
import { useRouter } from 'expo-router'
import { valideURLConvert } from '../../utils/valideURLConvert'
import HomeBanner from '../../components/HomeBanner'
import TodayDeals from '../../components/TodayDeals'
import FoodCategoryCard from '../../components/FoodCategoryCard'
import CategoryWiseProductDisplay from '../../components/CategoryWiseProductDisplay'

const { width: SW } = Dimensions.get('window')
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snapit-full-stack-production.up.railway.app'

const SUPER_APP_CATEGORIES = [
  { id: 'grocery',     label: 'Grocery',     emoji: '🛒', bg: '#f0fdf4', border: '#bbf7d0', path: '/grocery' },
  { id: 'food',        label: 'Food',        emoji: '🍔', bg: '#fff7ed', border: '#fed7aa', path: '/food' },
  { id: 'pharmacy',    label: 'Pharmacy',    emoji: '💊', bg: '#eff6ff', border: '#bfdbfe', path: '/pharmacy' },
  { id: 'electronics', label: 'Electronics', emoji: '📱', bg: '#faf5ff', border: '#e9d5ff', path: '/electronics', comingSoon: true },
]

const resolveImageUrl = (rawImg) => {
  const src = Array.isArray(rawImg) ? rawImg[0] : rawImg
  if (typeof src !== 'string' || !src.trim()) return null
  const c = src.trim()
  if (c.startsWith('//'))   return `https:${c}`
  if (c.startsWith('http')) return c
  if (c.startsWith('/'))    return `${BACKEND_URL}${c}`
  return c
}

const NUM_COLS  = 4
const PAD       = 16
const GAP       = 8
const ITEM_SIZE = (SW - PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS

const CategoryGridItem = React.memo(({ cat, onPress }) => {
  const url = resolveImageUrl(cat?.icon || cat?.image || cat?.imageUrl)
  return (
    <TouchableOpacity style={styles.catItem} onPress={() => onPress(cat._id, cat.name)} activeOpacity={0.7}>
      <View style={styles.catImageBox}>
        {url
          ? <Image source={{ uri: url }} style={styles.catImage} resizeMode="contain" />
          : <Text style={{ fontSize: 20 }}>🛒</Text>
        }
      </View>
      <Text style={styles.catLabel} numberOfLines={1}>{cat?.name || ''}</Text>
    </TouchableOpacity>
  )
})

const Skeleton = ({ w, h, r = 8 }) => (
  <View style={{ width: w, height: h, borderRadius: r, backgroundColor: '#f1f5f9' }} />
)

export default function Home() {
  const router          = useRouter()
  const loadingCategory = useSelector(s => s.product.loadingCategory)
  const categoryData    = useSelector(s => s.product.allCategory)
  const subCategoryData = useSelector(s => s.product.allSubCategory)

  const prioritized = useMemo(() => {
    if (!Array.isArray(categoryData)) return []
    const kw = ['atta', 'masala', 'oil', 'dal']
    return [...categoryData].sort((a, b) => {
      const aP = kw.some(k => (a?.name || '').toLowerCase().includes(k))
      const bP = kw.some(k => (b?.name || '').toLowerCase().includes(k))
      return aP === bP ? 0 : aP ? -1 : 1
    })
  }, [categoryData])

  const filtered = useMemo(() => {
    if (!Array.isArray(categoryData)) return []
    return categoryData.filter(c => !['grocery', 'pharmacy'].includes((c?.name || '').toLowerCase()))
  }, [categoryData])

  const handleCategoryPress = (id, catName) => {
    const sub = Array.isArray(subCategoryData)
      ? subCategoryData.find(s => Array.isArray(s?.category) && s.category.some(c => c?._id == id))
      : null
    if (sub) {
      router.push(`/${valideURLConvert(catName)}-${id}/${valideURLConvert(sub.name)}-${sub._id}`)
    } else {
      router.push(`/${valideURLConvert(catName)}-${id}`)
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} decelerationRate="normal">

      {/* Banner */}
      <HomeBanner />

      {/* Super-app cards */}
      <View style={styles.superRow}>
        {SUPER_APP_CATEGORIES.map(cat => <FoodCategoryCard key={cat.id} category={cat} />)}
      </View>

      {/* Shop by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SHOP BY CATEGORY</Text>
        <View style={styles.catGrid}>
          {loadingCategory
            ? new Array(12).fill(null).map((_, i) => (
                <View key={i} style={styles.catItem}>
                  <Skeleton w={ITEM_SIZE} h={ITEM_SIZE} />
                  <Skeleton w={ITEM_SIZE * 0.7} h={10} r={4} />
                </View>
              ))
            : filtered.map(cat => cat
                ? <CategoryGridItem key={cat._id} cat={cat} onPress={handleCategoryPress} />
                : null
              )
          }
        </View>
      </View>

      {/* Today's Deals */}
      <TodayDeals />

      {/* Category product rows */}
      <View style={{ gap: 4 }}>
        {loadingCategory
          ? [1,2,3].map(i => (
              <View key={i} style={styles.sectionSkeletonWrap}>
                <View style={styles.skeletonRow}>
                  <Skeleton w={120} h={18} />
                  <Skeleton w={60} h={18} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[1,2,3,4].map(j => <Skeleton key={j} w={150} h={220} r={16} />)}
                </ScrollView>
              </View>
            ))
          : prioritized.map(c => c?._id
              ? <CategoryWiseProductDisplay key={c._id} id={c._id} name={c.name} />
              : null
            )
        }
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#fff' },
  superRow:    { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  section:     { paddingHorizontal: 16, marginBottom: 24 },
  sectionLabel:{ fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12 },
  catGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  catItem:     { width: ITEM_SIZE, alignItems: 'center', gap: 4 },
  catImageBox: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', padding: 6, overflow: 'hidden' },
  catImage:    { width: '100%', height: '100%' },
  catLabel:    { fontSize: 10, fontWeight: '500', color: '#475569', textAlign: 'center', width: '100%' },
  sectionSkeletonWrap: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between' },
})