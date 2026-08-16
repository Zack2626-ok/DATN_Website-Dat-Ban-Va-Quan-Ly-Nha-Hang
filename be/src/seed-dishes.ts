import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { query } from "./utils/db";

dotenv.config();

interface DishSeedData {
  category: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  kitchen_station: "hot_kitchen" | "cold_kitchen" | "bar";
  is_featured: number;
}

const DISHES_DATA: DishSeedData[] = [
  // Khai vị
  {
    category: "Khai vị",
    name: "Nem rán giòn phố cổ Hà Nội",
    description: "Thịt heo băm nhuyễn chiên cùng mộc nhĩ, miến dong chín vàng giòn rụm.",
    price: 95000,
    image_url: "https://cdn.24h.com.vn/upload/3-2024/images/2024-09-16/1726451778-anh-1-nem-ran-mon-ngon-duoc-nh-5122-7195-1726286169-width680height464.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Khai vị",
    name: "Chả giò cua bể Hải Phòng cuốn chặt",
    description: "Cua bể tươi ngon béo ngậy trộn nấm mèo bọc trong vỏ bánh tráng giòn dai.",
    price: 125000,
    image_url: "https://www.nhahangquangon.com/wp-content/uploads/2018/04/nha-hang-qua-ngon-cha-gio-cua-be-1.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Khai vị",
    name: "Bánh bột lọc tôm sông đất cố đô",
    description: "Bột lọc trong suốt dẻo dai bọc tôm sông rim đậm đà chan nước mắm chua ngọt.",
    price: 75000,
    image_url: "https://banhchungngon.vn/wp-content/uploads/2023/07/banh-bot-loc-tom-dac-san-ngon-co-do-hue.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Khai vị",
    name: "Nem lụi nướng sả tươi Hội An",
    description: "Thịt heo giã nhuyễn bọc sả nướng than hoa ăn kèm rau sống và sốt đậu phộng.",
    price: 110000,
    image_url: "https://dulichviet.com.vn/images/bandidau/den-hue-thi-an-nem-lui-o-dau.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Khai vị",
    name: "Bánh xèo miền Tây sông nước vàng giòn",
    description: "Bánh xèo nhân giá đỗ, tôm thịt vỏ mỏng giòn rụm cuốn cải xanh ăn kèm nước mắm tỏi ớt đặc sắc.",
    price: 115000,
    image_url: "https://meetup.vn/wp-content/uploads/2025/10/banh-xeo-u-u-mien-tay-_601703848550.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Khai vị",
    name: "Gỏi ngó sen tôm thịt",
    description: "Ngó sen giòn sần sật trộn tôm đất tươi ngọt, thịt ba chỉ luộc và rau thơm.",
    price: 145000,
    image_url: "https://cdn.pastaxi-manager.onepas.vn/content/uploads/articles/hoamkt35/Blog/cach-lam-goi-ngo-sen-tom-thit%20(2).jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 1
  },
  {
    category: "Khai vị",
    name: "Gỏi hoa chuối bắp bò Tây Bắc",
    description: "Hoa chuối bào sợi mỏng bóp chua ngọt cùng bắp bò luộc mềm và lạc rang.",
    price: 135000,
    image_url: "https://cdn.tgdd.vn/2020/07/CookProduct/4-1200x676-1.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 0
  },
  {
    category: "Khai vị",
    name: "Cuốn diếp cải xanh tôm sông",
    description: "Tôm luộc, thịt ba rọi và bún tươi cuộn gọn trong lá cải xanh mát chấm tương đậu béo.",
    price: 85000,
    image_url: "https://cdn.tgdd.vn/2021/05/CookProduct/CookyVN---Cach-lam-CUON-DIEP-CHAY-cho-ngay-chay-thanh-dam---Cooky-TV-0-46-screenshot-1200x676.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 0
  },
  {
    category: "Khai vị",
    name: "Phở cuốn thịt bò tơ nướng Hà Nội",
    description: "Thịt bò xào lăn thơm phức cuốn trong bánh phở mềm mịn kèm rau thơm.",
    price: 120000,
    image_url: "https://static.vinwonders.com/production/mon-cuon-ha-noi-2.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 1
  },
  {
    category: "Khai vị",
    name: "Gỏi xoài xanh tôm khô đất chua ngọt",
    description: "Xoài xanh bào sợi chua thanh trộn tôm khô đất cay nồng đặc sắc.",
    price: 95000,
    image_url: "https://cdn.tgdd.vn/2020/06/CookProduct/1-1200x675-3.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 0
  },

  // Món chính
  {
    category: "Món chính",
    name: "Sò dương nướng sốt mỡ hành sa tế",
    description: "Sò tươi dai ngọt hòa quyện cùng sa tế thơm nồng.",
    price: 159000,
    image_url: "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2024_5_8_638507570627104712_so-duong-nuong-mo-hanh.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Cá chình nướng nghệ đất sét Hội An",
    description: "Cá chình béo ngậy ướp nghệ tươi nướng niêu đất sực mùi thơm thảo mộc.",
    price: 420000,
    image_url: "https://i.ytimg.com/vi/5r_PkYImPTg/hq720.jpg?sqp=-oaymwEkCK4FEIIDSFryq4qpAxYIARUAAAAAGAElAADIQj0AgKJDuAIZovOX_wMOCPnkq68GGODqBCDgqAE=&rs=AOn4CLD6RlphsmkdJN98wtgJIXsVRKNNWw&usqp=CBk",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Cá mú đỏ hấp tàu xì Hồng Kông",
    description: "Cá mú đỏ thịt ngọt chắc nướng chín tới cùng nước tương tàu xì hảo hạng.",
    price: 480000,
    image_url: "https://b1.congngheviet.com.vn/file/cdn-cnv04/vietlaithuan-com/wp-content/uploads/2024/05/ca-mu-do-hap-xi-dau.jpeg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Tôm hùm bông đút lò phô mai đút lò",
    description: "Tôm hùm thượng hạng nướng phô mai đút lò thơm lừng quyến rũ.",
    price: 1250000,
    image_url: "https://product.hstatic.net/200000626331/product/27_be7c6e0376594c43ba4e3b3445679852_large.png",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Hàu sữa Nha Trang nướng bơ tỏi",
    description: "Hàu sữa béo ngậy nướng sốt bơ tỏi thơm giòn.",
    price: 180000,
    image_url: "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2024_1_13_638407730521414033_cach-lam-hau-nuong-bo-toi-6.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Vịt quay gia truyền nguyên con",
    description: "Ăn kèm bánh bao hấp/chiên và sốt chấm tương đen truyền thống.",
    price: 1090000,
    image_url: "https://loquayconamsaigon.vn/wp-content/uploads/2021/05/vi%CC%A3t-quay-.png",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Vịt quay gia truyền nửa con",
    description: "Phù hợp cho nhóm khách nhỏ thưởng thức nét tinh túy ẩm thực.",
    price: 590000,
    image_url: "https://nntm.langson.gov.vn/api/user-blob/33000000-0000-0000-0000-000000000000/2024/09/27/vit-quay-lang-son.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Sườn heo nướng lá mắc mật Lạng Sơn",
    description: "Sườn heo tảng ướp mật ong rừng cùng lá mắc mật thơm dịu.",
    price: 280000,
    image_url: "https://static.hawonkoo.vn/hwks1/images/2023/10/cach-lam-suon-nuong-mat-ong-1.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Bò tơ nướng lụi bàn gang sả ớt",
    description: "Bò tơ mềm ngọt nướng cháy xém cạnh trên bản gang nóng hổi.",
    price: 340000,
    image_url: "https://cdn.eva.vn/upload/2-2021/images/2021-05-27/1622102668-762-thumbnail-width640height480_schema_article.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Heo sữa quay giòn giòn da",
    description: "Heo sữa nguyên con quay giòn da đỏ bóng ăn kèm dưa kiệu.",
    price: 1450000,
    image_url: "https://lh4.googleusercontent.com/jxHOvqQ0e2P-G3Co0cUc4GEJ-cG4hG9uFfDIjEvoGqdqfFdfWDLvybJycJJZzb2_y9BKFIR8xNE14m1Z8lUTa30vL1HFAZux8PMS8rw7clgVeqFcksqo7IgleMp-vghIh2ed8NwF",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Combo Sung Túc (3 - 4 người)",
    description: "Gồm gỏi ngó sen, gà nướng xôi phồng, cá kho tộ, canh chua Nam Bộ và cơm niêu đất.",
    price: 2300000,
    image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Combo Thịnh Soạn (5 - 6 người)",
    description: "Bổ sung hàu nướng bơ tỏi, heo quay bánh hỏi và lẩu hải sản chua cay thập cẩm.",
    price: 2830000,
    image_url: "https://traibostore.com/wp-content/uploads/2020/04/DSC06771-1024x768.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Combo Phố Cổ Hội An hội tụ",
    description: "Trải nghiệm trọn vẹn đặc sản cơm gà Hội An, cao lầu thịt xá xíu và bánh vạc tai vạc.",
    price: 1850000,
    image_url: "https://thanhnienmoi.com/upload/images/mon-an-ngon-o-hoi-an-01.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Cơm niêu đất xá xíu hoàng kim hạt dẻo",
    description: "Cơm niêu nóng hổi phủ thịt xá xíu mềm thơm, trứng muối bùi béo ngọt ngào.",
    price: 145000,
    image_url: "https://haisu.vn/Upload/Products/040226092016.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Canh chua cá lóc Nam Bộ chuẩn vị",
    description: "Nước dùng cá lóc tươi nấu chua chua ngọt ngọt cùng dứa, dọc mùng và me quả.",
    price: 120000,
    image_url: "https://cdn.hstatic.net/files/200000700229/article/canh-chua-ca-loc-1_781a4b2319e64ec493613c6fc2dfa441.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Mỳ Quảng gà ta trứng cút đặc sản",
    description: "Sợi mỳ vàng dai cùng gà ta kho đậm đà, rắc lạc rang và bánh đa giòn rụm.",
    price: 85000,
    image_url: "https://statics.vinpearl.com/mi-quang-ga-2_1635278013.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Mỳ Quảng tôm thịt sườn non rút xương",
    description: "Sự kết hợp tuyệt vời của tôm sông rim ngọt và sườn non ninh mềm mượt.",
    price: 95000,
    image_url: "https://cdn.tgdd.vn/2021/01/CookProductThumb/MIQUANGSUONNONVATOMCachNauMiQuangChinhGocMienTrungThomNgonBepCuiTV14-14screenshot620-620x620.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Phở bò Wagyu tái lăn đặc biệt",
    description: "Sự giao thoa ẩm thực Việt Nhật với thịt bò Wagyu xào tái lăn cùng hành hoa.",
    price: 185000,
    image_url: "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/pho_wagyu_8ecc115d3f.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 1
  },
  {
    category: "Món chính",
    name: "Bún bò Huế ngự uyển chân giò",
    description: "Nước dùng cay nồng mùi sả mắm ruốc đặc trưng, ăn kèm chả cua bể.",
    price: 90000,
    image_url: "https://hotel84.com/hotel84-images/news/photo/bun-bo-hue-nguuyen.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Món chính",
    name: "Bún chả nem cua bể Hà Nội nướng chao",
    description: "Thịt viên nướng cháy cạnh thơm lừng ăn kèm nem cua bể giòn ngọt ngào.",
    price: 95000,
    image_url: "https://hanoidep.vn/wp-content/uploads/2026/01/bun-cha-nem-cua-be-hoang-yen-2-p-ly-thai-to-ly-thai-to-hoan-kiem-ha-noi-4-1200x900.jpeg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },

  // Lẩu
  {
    category: "Lẩu",
    name: "Lẩu Thái chua cay",
    description: "Lẩu chua cay kiểu Thái kèm hải sản và rau nấm.",
    price: 350000,
    image_url: "https://i-giadinh.vnecdn.net/2022/12/17/Thanh-pham-1-1-5372-1671269525.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },
  {
    category: "Lẩu",
    name: "Lẩu hải sản sâm đất",
    description: "Lẩu hải sản tươi ngọt nấu kèm sâm đất thanh mát.",
    price: 400000,
    image_url: "https://www.nhahangquangon.com/wp-content/uploads/2015/01/nguyen-lieu-can-co-cho-mon-lau-hai-san.jpg",
    kitchen_station: "hot_kitchen",
    is_featured: 0
  },

  // Đồ uống
  {
    category: "Đồ uống",
    name: "Trà ô long sen vàng kem sữa béo",
    description: "Trà ô long mộc mạc thơm lừng lớp kem phô mai béo ngậy mặn mặn.",
    price: 65000,
    image_url: "https://cdn2.fptshop.com.vn/unsafe/1920x0/filters:format(webp):quality(75)/2023_10_16_638330824143577933_tra-sen-vang-thumb.jpg",
    kitchen_station: "bar",
    is_featured: 0
  },
  {
    category: "Đồ uống",
    name: "Trà đào cam sả hạt chia tươi",
    description: "Hương sả nồng ấm hòa quyện đào lát giòn ngọt mọng nước.",
    price: 55000,
    image_url: "https://bearviet.vn/wp-content/uploads/2023/11/cach-pha-tra-dao-cam-sa-ngon-2.jpg",
    kitchen_station: "bar",
    is_featured: 0
  },
  {
    category: "Đồ uống",
    name: "Sinh tố bơ dừa sáp béo ngậy",
    description: "Bơ sáp Đắk Lắk xay nhuyễn cùng sữa đặc và nước cốt dừa thơm béo.",
    price: 75000,
    image_url: "https://media-cdn-v2.laodong.vn/storage/newsportal/2026/6/7/1714933/Sinh-To-Bo-Dua.jpeg",
    kitchen_station: "bar",
    is_featured: 0
  },
  {
    category: "Đồ uống",
    name: "Nước ép cam xoài tươi nhiệt đới",
    description: "Cung cấp vitamin dồi dào từ cam vàng và xoài cát chín thơm ngon.",
    price: 60000,
    image_url: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=800&auto=format&fit=crop&q=80",
    kitchen_station: "bar",
    is_featured: 0
  },
  {
    category: "Đồ uống",
    name: "Cocktail Restro Signature",
    description: "Sự kết hợp tinh tế giữa rượu Gin, nước cốt chanh dây, lá bạc hà tươi mát.",
    price: 165000,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80",
    kitchen_station: "bar",
    is_featured: 1
  },
  {
    category: "Đồ uống",
    name: "Sâm dứa sữa dừa đá bào Hội An",
    description: "Thức uống tuổi thơ giải nhiệt nhanh chóng.",
    price: 40000,
    image_url: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=800&auto=format&fit=crop&q=80",
    kitchen_station: "bar",
    is_featured: 0
  },
  {
    category: "Đồ uống",
    name: "Cà phê cốt dừa Hà Nội thơm nồng",
    description: "Cà phê espresso sánh đậm xay cùng đá và cốt dừa sánh béo ngậy.",
    price: 55000,
    image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=80",
    kitchen_station: "bar",
    is_featured: 0
  },

  // Tráng miệng
  {
    category: "Tráng miệng",
    name: "Chè hạt sen long nhãn Huế",
    description: "Hạt sen bùi dẻo bọc trong nhãn lồng cùi dày ngọt lịm.",
    price: 45000,
    image_url: "https://quahueonline.com/wp-content/uploads/2021/06/che-hat-sen-long-nhan.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 1
  },
  {
    category: "Tráng miệng",
    name: "Sữa chua hoa quả đác hạt dẻo",
    description: "Sữa chua lên men tự nhiên trộn cùng dâu tây, kiwi và hạt đác rim mật.",
    price: 50000,
    image_url: "https://cdn2.fptshop.com.vn/unsafe/Uploads/images/tin-tuc/173331/Originals/sua-chua-hat-dac-6.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 0
  },
  {
    category: "Tráng miệng",
    name: "Chè trôi nước ngũ sắc trân châu",
    description: "Bánh trôi nước năm màu dẻo dai nhân đậu xanh chan nước cốt dừa béo.",
    price: 40000,
    image_url: "https://www.lorca.vn/wp-content/uploads/2023/08/6-31.jpg",
    kitchen_station: "cold_kitchen",
    is_featured: 0
  }
];

async function seedDishes() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           🌱 SAFE SEED MENU ITEMS - Restro               ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();

  try {
    // 1. Fetch categories map to retrieve their database IDs
    console.log("🔍 Fetching categories list from DB...");
    const categories = await query<any[]>("SELECT id, name FROM categories");
    const categoryMap: Record<string, number> = {};
    for (const cat of categories) {
      categoryMap[cat.name] = cat.id;
    }
    console.log("📂 Current DB categories map:", categoryMap);

    // 2. Perform safe Upsert (check if exists by name first)
    console.log(`\n⚡ Processing ${DISHES_DATA.length} dishes...`);
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of DISHES_DATA) {
      // Find category ID from category map
      let categoryId = categoryMap[item.category];
      if (!categoryId) {
        // Fallback: create category if not exists
        console.log(`➕ Category "${item.category}" not found. Creating it...`);
        const catInsert = await query<any>("INSERT INTO categories (name, sort_order) VALUES (?, 10)", [item.category]);
        categoryId = catInsert.insertId;
        categoryMap[item.category] = categoryId;
      }

      // Check if menu item already exists by name
      const existingItems = await query<any[]>("SELECT id FROM menu_items WHERE name = ?", [item.name]);

      if (existingItems.length > 0) {
        const existingId = existingItems[0].id;
        // UPDATE existing record (Upsert)
        await query(
          `UPDATE menu_items 
           SET category_id = ?, description = ?, price = ?, image_url = ?, kitchen_station = ?, is_featured = ? 
           WHERE id = ?`,
          [
            categoryId,
            item.description,
            item.price,
            item.image_url,
            item.kitchen_station,
            item.is_featured,
            existingId
          ]
        );
        updatedCount++;
      } else {
        // INSERT brand new record
        await query(
          `INSERT INTO menu_items (category_id, name, description, price, image_url, kitchen_station, is_featured, is_active, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
          [
            categoryId,
            item.name,
            item.description,
            item.price,
            item.image_url,
            item.kitchen_station,
            item.is_featured
          ]
        );
        insertedCount++;
      }
    }

    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║               📊 SAFE SEEDING RESULTS                   ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  ➕ Newly Inserted: ${String(insertedCount).padStart(4)} dishes                        ║`);
    console.log(`║  🔄 Safely Updated: ${String(updatedCount).padStart(4)} dishes                        ║`);
    console.log("╚══════════════════════════════════════════════════════════╝");
    
    // --- 3. SEED INVENTORY TEST CASES ---
    console.log("\n🧪 Injecting Inventory Test Cases (FEFO & Batches)...");

    // Case 1: Thêm Saffron (Nguyên liệu mới) nếu chưa có
    let saffronId;
    const saffronCheck = await query<any[]>("SELECT id FROM ingredients WHERE name = 'Saffron (Nhụy hoa nghệ tây)'");
    if (saffronCheck.length === 0) {
      const safRes = await query<any>(`
        INSERT INTO ingredients (name, unit, min_stock, current_stock)
        VALUES ('Saffron (Nhụy hoa nghệ tây)', 'g', 10, 0)
      `);
      saffronId = safRes.insertId;
      console.log("   ➕ Created new ingredient: Saffron");
    } else {
      saffronId = saffronCheck[0].id;
    }

    // Xóa các lô test cũ để tránh lặp nếu chạy seed nhiều lần
    await query("DELETE FROM stock_in WHERE batch_code LIKE 'TEST-%'");

    // Case 1: Nhập Saffron (Mới)
    await query(`
      INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by)
      VALUES (?, 'TEST-SAFFRON-01', 50, 50, 200000, 1, '2028-12-31', 'Test nhập lô nguyên liệu hoàn toàn mới', 1)
    `, [saffronId]);
    await query("UPDATE ingredients SET current_stock = current_stock + 50 WHERE id = ?", [saffronId]);

    // Case 2: Nhập bồi Thịt bò (Đã có lô cũ)
    // Thịt bò ID = 1 (trong SQLQuery1)
    await query(`
      INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by)
      VALUES (1, 'TEST-THITBO-NEW', 30, 30, 270000, 1, '2026-10-15', 'Test nhập bồi lô mới cho nguyên liệu cũ', 1)
    `);
    await query("UPDATE ingredients SET current_stock = current_stock + 30 WHERE id = 1");

    // Case 3: Nhập Gia vị không có NCC
    let spiceId;
    const spiceCheck = await query<any[]>("SELECT id FROM ingredients WHERE name = 'Gia vị tổng hợp test'");
    if (spiceCheck.length === 0) {
      const spiceRes = await query<any>(`
        INSERT INTO ingredients (name, unit, min_stock, current_stock)
        VALUES ('Gia vị tổng hợp test', 'gói', 5, 0)
      `);
      spiceId = spiceRes.insertId;
    } else {
      spiceId = spiceCheck[0].id;
    }
    await query(`
      INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, note, created_by)
      VALUES (?, 'TEST-SPICE-NONCC', 100, 100, 5000, NULL, NULL, 'Test khuyết nhà cung cấp và khuyết HSD', 1)
    `, [spiceId]);
    await query("UPDATE ingredients SET current_stock = current_stock + 100 WHERE id = ?", [spiceId]);

    console.log("   ✅ Seeded Inventory Test Cases.");

    process.exit(0);
  } catch (err: any) {
    console.error("❌ ERROR SEEDING DISHES IN DB:", err.message);
    process.exit(1);
  }
}

seedDishes();
