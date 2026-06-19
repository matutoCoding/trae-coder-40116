import type {
  DiscountCoupon,
  DiscountDetail,
  DiscountOrderConfig,
  DiscountType
} from '../types'

export const DEFAULT_DISCOUNT_ORDER: DiscountType[] = ['full_reduction', 'coupon']

export function validateCoupon(coupon: DiscountCoupon, currentDate: string): boolean {
  if (currentDate < coupon.validFrom || currentDate > coupon.validTo) {
    return false
  }
  return true
}

export function applyCouponDiscount(
  amount: number,
  coupon: DiscountCoupon
): { discountedAmount: number; discountAmount: number } {
  if (!validateCoupon(coupon, new Date().toISOString().slice(0, 10))) {
    return { discountedAmount: amount, discountAmount: 0 }
  }

  if (coupon.type === 'coupon' && coupon.discountRate) {
    let discountAmount = amount * (1 - coupon.discountRate)
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount)
    }
    const discountedAmount = Math.max(0, amount - discountAmount)
    return {
      discountedAmount: Math.round(discountedAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100
    }
  }

  if (coupon.type === 'full_reduction' && coupon.discountAmount) {
    const threshold = coupon.threshold ?? 0
    if (amount >= threshold) {
      const discountAmount = coupon.discountAmount
      const discountedAmount = Math.max(0, amount - discountAmount)
      return {
        discountedAmount: Math.round(discountedAmount * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100
      }
    }
  }

  return { discountedAmount: amount, discountAmount: 0 }
}

export function applyMultipleDiscounts(
  originalAmount: number,
  coupons: DiscountCoupon[],
  orderConfig: DiscountOrderConfig = { order: DEFAULT_DISCOUNT_ORDER }
): {
  finalAmount: number
  totalDiscount: number
  discountDetails: DiscountDetail[]
} {
  if (coupons.length === 0) {
    return {
      finalAmount: originalAmount,
      totalDiscount: 0,
      discountDetails: []
    }
  }

  const currentDate = new Date().toISOString().slice(0, 10)
  const validCoupons = coupons.filter(c => validateCoupon(c, currentDate))

  const nonStackableCoupon = validCoupons.find(c => !c.isStackable)
  let applicableCoupons: DiscountCoupon[]

  if (nonStackableCoupon) {
    const nonStackableResult = applyCouponDiscount(originalAmount, nonStackableCoupon)
    const stackableCoupons = validCoupons.filter(c => c.isStackable)
    let stackableTotalDiscount = 0
    let tempAmount = nonStackableResult.discountedAmount

    const sortedCoupons = sortCouponsByOrder(stackableCoupons, orderConfig.order)

    const stackableDetails: DiscountDetail[] = []
    sortedCoupons.forEach((coupon, index) => {
      const result = applyCouponDiscount(tempAmount, coupon)
      if (result.discountAmount > 0) {
        stackableTotalDiscount += result.discountAmount
        tempAmount = result.discountedAmount
        stackableDetails.push({
          couponId: coupon.id,
          couponName: coupon.name,
          type: coupon.type,
          discountAmount: result.discountAmount,
          appliedOrder: index + 2
        })
      }
    })

    const allDetails: DiscountDetail[] = [
      {
        couponId: nonStackableCoupon.id,
        couponName: nonStackableCoupon.name,
        type: nonStackableCoupon.type,
        discountAmount: nonStackableResult.discountAmount,
        appliedOrder: 1
      },
      ...stackableDetails
    ]

    const finalAmount = Math.max(0, tempAmount)

    return {
      finalAmount: Math.round(finalAmount * 100) / 100,
      totalDiscount: Math.round(
        (nonStackableResult.discountAmount + stackableTotalDiscount) * 100
      ) / 100,
      discountDetails: allDetails
    }
  } else {
    applicableCoupons = validCoupons
  }

  const sortedCoupons = sortCouponsByOrder(applicableCoupons, orderConfig.order)

  let currentAmount = originalAmount
  const discountDetails: DiscountDetail[] = []
  let totalDiscount = 0

  sortedCoupons.forEach((coupon, index) => {
    const result = applyCouponDiscount(currentAmount, coupon)
    if (result.discountAmount > 0) {
      totalDiscount += result.discountAmount
      currentAmount = result.discountedAmount
      discountDetails.push({
        couponId: coupon.id,
        couponName: coupon.name,
        type: coupon.type,
        discountAmount: result.discountAmount,
        appliedOrder: index + 1
      })
    }
  })

  const finalAmount = Math.max(0, currentAmount)

  return {
    finalAmount: Math.round(finalAmount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    discountDetails
  }
}

export function sortCouponsByOrder(
  coupons: DiscountCoupon[],
  order: DiscountType[]
): DiscountCoupon[] {
  const typePriority = new Map<DiscountType, number>()
  order.forEach((type, index) => typePriority.set(type, index))

  return [...coupons].sort((a, b) => {
    const priorityA = typePriority.get(a.type) ?? order.length
    const priorityB = typePriority.get(b.type) ?? order.length

    if (priorityA !== priorityB) return priorityA - priorityB

    if (a.type === 'full_reduction' && b.type === 'full_reduction') {
      return (b.threshold ?? 0) - (a.threshold ?? 0)
    }

    if (a.type === 'coupon' && b.type === 'coupon') {
      return (a.discountRate ?? 1) - (b.discountRate ?? 1)
    }

    return 0
  })
}

export function calculateOptimalDiscount(
  originalAmount: number,
  coupons: DiscountCoupon[],
  orderConfig: DiscountOrderConfig
): {
  finalAmount: number
  totalDiscount: number
  discountDetails: DiscountDetail[]
  usedCoupons: DiscountCoupon[]
} {
  const nonStackable = coupons.filter(c => !c.isStackable)
  const stackable = coupons.filter(c => c.isStackable)

  let bestResult = applyMultipleDiscounts(originalAmount, stackable, orderConfig)
  let bestUsedCoupons = stackable

  nonStackable.forEach(coupon => {
    const result = applyMultipleDiscounts(originalAmount, [coupon, ...stackable], orderConfig)
    if (result.finalAmount < bestResult.finalAmount) {
      bestResult = result
      bestUsedCoupons = [coupon, ...stackable.filter(c =>
        result.discountDetails.some(d => d.couponId === c.id)
      )]
    }
  })

  const actualUsed = bestUsedCoupons.filter(c =>
    bestResult.discountDetails.some(d => d.couponId === c.id)
  )

  return {
    ...bestResult,
    usedCoupons: actualUsed
  }
}
