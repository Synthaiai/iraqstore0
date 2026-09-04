/**
 * Curated photography pools, sourced from Unsplash.
 * Each entry is the stable image slug; `img()` applies sizing + format params
 * so every request is served as an optimised, correctly cropped asset.
 */

const BASE = 'https://images.unsplash.com/';

/**
 * Quality is deliberately low. Unsplash re-encodes to AVIF/WebP via `auto=format`,
 * and at q=52 a 480px card image lands around 20–30 KB — the difference between
 * a grid that paints on a weak connection and one that doesn't.
 */
const Q = 38;

export function img(slug, w = 340, h, q = Q) {
  if (!slug) return '/logo.jpg';
  if (typeof slug === 'string' && (slug.startsWith('http://') || slug.startsWith('https://') || slug.startsWith('data:') || slug.startsWith('/'))) {
    return slug;
  }
  const crop = h ? `&h=${h}` : '';
  return `${BASE}${slug}?auto=format,compress&fm=webp&fit=crop&w=${w}${crop}&q=${q}`;
}

/**
 * Width-descriptor srcset. Paired with a `sizes` attribute this lets a 360px
 * phone fetch the 320w file instead of the 960w one.
 */
export function srcSet(slug, widths, ratio, q = Q) {
  if (!slug || (typeof slug === 'string' && (slug.startsWith('http://') || slug.startsWith('https://') || slug.startsWith('data:') || slug.startsWith('/')))) {
    return undefined;
  }
  return widths
    .map((w) => `${img(slug, w, ratio ? Math.round(w * ratio) : undefined, q)} ${w}w`)
    .join(', ');
}

/** Portrait product crop (3:4). */
export const CARD_WIDTHS = [240, 320, 420, 560, 720];
export const cardSrcSet = (slug) => srcSet(slug, CARD_WIDTHS, 4 / 3);

/** Wide crop, for the hero. */
export function imgWide(slug, w = 1280, h = 720) {
  return img(slug, w, h, 55);
}

export const heroSrcSet = (slug) => srcSet(slug, [640, 960, 1280, 1800], 9 / 16, 55);

export const POOLS = {
  // ---------- Men · Shoes ----------
  // Sneaker stock photography is dominated by logo-forward shots; this pool is
  // filtered down to frames with no legible third-party brand marks.
  mSneakers: [
    'photo-1586556694812-fdae68467216',
    'photo-1676379827583-4c57b80bc58e',
    'photo-1544441892-83af2e53ea48',
    'photo-1603808033192-082d6919d3e1',
    'photo-1620989928625-08536e746255',
    'photo-1625860191460-10a66c7384fb',
    'photo-1608379743498-ac08f6d022ba',
    'photo-1577106438476-47949d566fa5',
    'photo-1577106436954-eb29e215beff',
    'photo-1680254418515-ebcb06be0e80',
    'photo-1680254418652-7ffe87e6955a',
    'photo-1578269174432-a8073d86c2e0',
    'photo-1604815886677-12a2ca06461b',
    'photo-1645784127380-77aeb81be500',
    'photo-1634630797363-dd390bc3577b',
    'photo-1761854149912-54ced79870ec',
  ],
  mFormal: [
    'photo-1614252235316-8c857d38b5f4',
    'photo-1668069226492-508742b03147',
    'photo-1641893843833-a006778dc00b',
    'photo-1625357165350-bdbcb6d7d524',
    'photo-1603191659812-ee978eeeef76',
    'photo-1673332655640-d97338b1c6b7',
    'photo-1634304138376-43a922e96c80',
    'photo-1563434564528-8fdf5996e622',
    'photo-1625037676697-295bff156f5a',
    'photo-1603796847227-9183fd69e884',
    'photo-1616696038562-574c18066055',
    'photo-1563434649554-58f91d22ec2c',
  ],
  mLoafers: [
    'photo-1678784973551-f38208de2529',
    'photo-1678784973073-f6a227408e81',
    'photo-1654945419086-bcb1c1e1b875',
    'photo-1576792741377-eb0f4f6d1a47',
    'photo-1664095885197-fdff6611560c',
    'photo-1556004583-d2aaffbba592',
    'photo-1616243344308-04fb7e776cfe',
    'photo-1521330784804-5f69f8a17b1d',
    'photo-1662541089338-c7d53b88be70',
    'photo-1653773397011-26eb42267ac6',
    'photo-1732706415177-14f7dced80d5',
    'photo-1676121270762-47c8d3a7b9d5',
  ],

  // ---------- Men · Clothing ----------
  mShirts: [
    'photo-1507680434567-5739c80be1ac',
    'photo-1627686011747-74adda3d2343',
    'photo-1605794432120-f4bb5dc9067d',
    'photo-1621072156002-e2fccdc0b176',
    'photo-1623756596824-aa42a04e3d01',
    'photo-1598857462544-6e70317da2f2',
    'photo-1644483878398-b57d19f84ff8',
    'photo-1645389776499-b5eeb2afca0d',
    'photo-1661802365632-bb2b2f68eb51',
    'photo-1719650979576-72055a21a658',
    'photo-1740711152088-88a009e877bb',
    'photo-1753741903170-256a4a2c1eb5',
  ],
  mSuits: [
    'photo-1617127365659-c47fa864d8bc',
    'photo-1617137984095-74e4e5e3613f',
    'photo-1622497170185-5d668f816a56',
    'photo-1623880840102-7df0a9f3545b',
    'photo-1617113930975-f9c7243ae527',
    'photo-1600091166971-7f9faad6c1e2',
    'photo-1603394151492-5e9b974b090b',
    'photo-1622450180332-3da1126f10a4',
    'photo-1593030103066-0093718efeb9',
    'photo-1630173250799-2813d34ed14b',
    'photo-1598808503746-f34c53b9323e',
  ],
  mOuter: [
    'photo-1619603364937-8d7af41ef206',
    'photo-1635205383325-aa3e6fb5ba55',
    'photo-1642886513052-d24b4f4745ea',
    'photo-1627906933655-906bde7d79e2',
    'photo-1626307416562-ee839676f5fc',
    'photo-1642886513308-d21acc15057d',
    'photo-1644186847699-db6ef60688e0',
    'photo-1609840174228-1cde0b4ac7fc',
    'photo-1667842420679-718ed22a0b50',
    'photo-1715536369840-9e314f847d78',
    'photo-1675408824613-27a7e7b8d475',
    'photo-1641744849620-38c4987814c9',
    'photo-1610901157620-340856d0a50f',
    'photo-1642886512785-b5fee9faad7f',
  ],
  mTrousers: [
    'photo-1542272604-787c3835535d',
    'photo-1714729382668-7bc3bb261662',
    'photo-1605518216938-7c31b7b14ad0',
    'photo-1714143136372-ddaf8b606da7',
    'photo-1718252540511-e958742e4165',
    'photo-1592115654397-9117a2d021c4',
    'photo-1605518215584-5ba74df5dfd8',
    'photo-1633963643586-1a39077623be',
    'photo-1587425206783-d51b608ea87e',
    'photo-1473966968600-fa801b869a1a',
    'photo-1617456343391-ead32a0324db',
    'photo-1421986386270-978ed214ec60',
  ],

  // ---------- Men · Accessories ----------
  mWatches: [
    'photo-1524805444758-089113d48a6d',
    'photo-1547996160-81dfa63595aa',
    'photo-1542496658-e33a6d0d50f6',
    'photo-1548171838-1fd4cb4ab854',
    'photo-1578998323870-83a9a3d609e5',
    'photo-1600003014637-ff82a275e191',
    'photo-1582150264904-e0bea5ef0ad1',
    'photo-1623998021661-dc7555b2213d',
    'photo-1579543768549-96d37c1df78f',
    'photo-1607776905497-b4f788205f6a',
    'photo-1670404160620-a3a86428560e',
    'photo-1639736922209-793b59a41572',
  ],
  mLeather: [
    'photo-1627123424574-724758594e93',
    'photo-1579014134953-1580d7f123f3',
    'photo-1628483211662-9bcc692c46dc',
    'photo-1624538000860-24716b9050f2',
    'photo-1614330315526-166f2d71e544',
    'photo-1531190260877-c8d11eb5afaf',
    'photo-1637868796504-32f45a96d5a0',
    'photo-1614267118647-20c5ffa6a6e4',
    'photo-1614330315994-efd5ea8163a1',
    'photo-1517254797898-04edd251bfb3',
    'photo-1664286074176-5206ee5dc878',
    'photo-1624222247344-550fb60583dc',
  ],
  eyewear: [
    'photo-1632973039410-aa5cd16908bb',
    'photo-1623317704711-ed07f616946c',
    'photo-1618436623941-40676b73df53',
    'photo-1620439577091-6d1f44d603db',
    'photo-1587304883252-dc18e6a7cbc8',
    'photo-1623071279541-3cdd462f4363',
    'photo-1623071278916-96f6cfc30dfd',
    'photo-1623071277335-d40b91f75868',
    'photo-1619352915587-28b0581086f3',
    'photo-1587304883270-ccb401631f96',
    'photo-1619352915762-2f7eec847297',
    'photo-1644665958440-3f635af45420',
  ],

  // ---------- Women · Shoes ----------
  wHeels: [
    'photo-1543163521-1bf539c55dd2',
    'photo-1535043934128-cf0b28d52f95',
    'photo-1573100925118-870b8efc799d',
    'photo-1596703263926-eb0762ee17e4',
    'photo-1611233299310-f6276ff55307',
    'photo-1551489186-ccb95a1ea6a3',
    'photo-1554062614-6da4fa67725a',
    'photo-1562687848-c1664eff566d',
    'photo-1524553879936-2ff074ae5816',
    'photo-1632793039179-8d97795d20c6',
    'photo-1591884807537-0bce39888fe0',
    'photo-1596702874230-b5706dfb5bc7',
  ],
  wSneakers: [
    'photo-1626379625260-7111605463e8',
    'photo-1627361673902-c80df14aecdd',
    'photo-1585591359088-e144e8a61170',
    'photo-1599670998937-441a3a74b2f1',
    'photo-1630524233940-8fda17e3d190',
    'photo-1623496928880-9ced3876d2ea',
    'photo-1626463901729-d108378c4e32',
    'photo-1582231640349-6ea6881fabeb',
    'photo-1544441892-794166f1e3be',
    'photo-1622760808027-095ea611f657',
  ],
  wBoots: [
    'photo-1531310197839-ccf54634509e',
    'photo-1610685756406-0f2fdc231bf0',
    'photo-1552256028-71eb9a7ff27d',
    'photo-1621996659490-3275b4d0d951',
    'photo-1573688886816-d0072f2b8b77',
    'photo-1494955464529-790512c65305',
    'photo-1573920372704-3b46ad13f5f9',
    'photo-1580219137022-5f66e671df8b',
    'photo-1521144236085-322e24bfa95a',
    'photo-1763661300203-aa3e2702f510',
  ],
  wFlats: [
    'photo-1604136172384-b2e9c43271ec',
    'photo-1573363908457-f56841fff7c4',
    'photo-1544904528-3d49235539b7',
    'photo-1638810794193-21ac7c775487',
    'photo-1654056794740-8899e0aa9039',
    'photo-1645035028480-55049f67e7cd',
    'photo-1664798901489-b256769c5800',
    'photo-1625037679112-d3ef9fa799cf',
    'photo-1720604083961-88336789791e',
    'photo-1758542988664-49951c5b1999',
  ],

  // ---------- Women · Clothing ----------
  wDresses: [
    'photo-1664076458686-3449062080ac',
    'photo-1618244965061-1d27b208d6e8',
    'photo-1668952135120-7d997b1b3778',
    'photo-1663220274232-740f07723310',
    'photo-1637690048998-1e41c61c254d',
    'photo-1779398968962-b3ad149b57b6',
    'photo-1779398969439-99c38b9df638',
    'photo-1782808483781-f67b519a8f7c',
    'photo-1779398970408-1454e2a126c2',
    'photo-1783095627811-f83b858a2c98',
    'photo-1763750784315-e35f75ef1f2a',
    'photo-1765229288423-0013fdc66d9f',
  ],
  wGowns: [
    'photo-1589212987511-4a924cb9d8ac',
    'photo-1583039949165-96ee24b0d8de',
    'photo-1761574028262-6d834741bfd8',
    'photo-1761574028030-6d42536b9b12',
    'photo-1763336016192-c7b62602e993',
    'photo-1761574028992-1a72e1867b3c',
    'photo-1764593822632-7c0b8a1f5fde',
    'photo-1768609956986-7c1776f70454',
    'photo-1760328249113-31c07547aea8',
    'photo-1763029803944-648ed8638219',
    'photo-1763959944507-696ac03bf309',
    'photo-1777713272516-e7b2216fe15e',
  ],
  wModest: [
    'photo-1733217854160-d76db1a19e48',
    'photo-1618407960998-7864dd928574',
    'photo-1767469697194-ac997d70b1ee',
    'photo-1762376268273-645db555eaf9',
    'photo-1769867617607-fb694bfdfab3',
    'photo-1762605135326-5c4bcc5ef006',
    'photo-1770367358711-b42cf1a6c2b1',
    'photo-1769867618623-3687291334c3',
    'photo-1762605135376-ae5af70a5628',
    'photo-1770964211782-013475eacc3f',
    'photo-1731613157654-93faac9e7809',
    'photo-1745324007152-f9c34ccb2543',
  ],
  wOuter: [
    'photo-1592327877233-90b9bfd92e48',
    'photo-1608234808654-2a8875faa7fd',
    'photo-1618244985759-a8a1dc26bce3',
    'photo-1539533018447-63fcce2678e3',
    'photo-1583846552345-d2aa9d764209',
    'photo-1633821879282-0c4e91f96232',
    'photo-1597582876998-69b63639ff5d',
    'photo-1606683380103-937f9f1f49e1',
    'photo-1664029593173-183fbb854642',
    'photo-1622026951718-cf44b86d746d',
    'photo-1716004359569-052b4d8b3713',
    'photo-1700407524571-89de73aa0c54',
  ],
  wTops: [
    'photo-1643825664857-7e6e4124f289',
    'photo-1574201635302-388dd92a4c3f',
    'photo-1642853474532-9aca78f70629',
    'photo-1599446465943-46add8cd0c5e',
    'photo-1604632482693-76d59bf352b0',
    'photo-1662273397746-86fc7e6cfc0f',
    'photo-1599446467888-6d803c87a7aa',
    'photo-1642853474913-47215b056991',
    'photo-1598622444660-9d76ceeb7daf',
    'photo-1674847059292-d9acc69341d1',
    'photo-1635447272975-15e89512725a',
    'photo-1780764206348-a813ee9781d0',
  ],

  // ---------- Women · Accessories ----------
  wBags: [
    'photo-1691480150204-66dd1eb77391',
    'photo-1640901555383-7335ec5a6476',
    'photo-1560891958-68bb1fe7fb78',
    'photo-1718622795525-2295971921ba',
    'photo-1691480250099-a63081ecfcb8',
    'photo-1702326626601-74d2e86922b4',
    'photo-1774702535799-4d08aec80b96',
    'photo-1774702535771-eec0c74d6cb9',
    'photo-1735150033185-aad608b9686b',
    'photo-1685945000361-903ada70ca15',
    'photo-1746880223690-359948154c53',
  ],
  wJewelry: [
    'photo-1585960622850-ed33c41d6418',
    'photo-1601121141461-9d6647bca1ed',
    'photo-1603974372039-adc49044b6bd',
    'photo-1611107683227-e9060eccd846',
    'photo-1600862754152-80a263dd564f',
    'photo-1655255114527-d0a834d9a774',
    'photo-1651160670627-2896ddf7822f',
    'photo-1694062045776-f48d9b6de57e',
    'photo-1682823544433-aae34df4e3da',
    'photo-1654781456542-fdd1683c79c3',
    'photo-1601121141499-17ae80afc03a',
    'photo-1722410180687-b05b50922362',
  ],

  // ---------- Editorial / covers ----------
  // Editorial frames are vetted to be free of third-party brand marks —
  // a competitor's wordmark in our own hero would be worse than no photo.
  editorial: [
    'photo-1489987707025-afc232f7ea0f',
    'photo-1441986300917-64674bd600d8',
    'photo-1558769132-cb1aea458c5e',
    'photo-1567401893414-76b7b1e5a7a5',
    'photo-1642571969491-5d8b9eb4e809',
    'photo-1629296967944-eb61e53efa91',
  ],
  menEditorial: [
    'photo-1519085360753-af0119f7cbe7',
    'photo-1614252368727-99517bc90d7b',
    'photo-1504593811423-6dd665756598',
    'photo-1599725728598-dc7ed109ff89',
    'photo-1511653367532-878246b8732d',
    'photo-1617137977259-bb83e191f377',
  ],
};
