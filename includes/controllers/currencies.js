module.exports = function ({ api, event, models }) {
    const Currencies = models.use('Currencies');

    async function getAll(...data) {
        var where, attributes;
        for (const i of data) {
            if (typeof i != 'object') throw new Error("Cần một đối tượng hoặc mảng.");
            if (Array.isArray(i)) attributes = i;
            else where = i;
        }
        try {
            return (await Currencies.findAll({ where, attributes })).map(e => e.get({ plain: true }));
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function getData(userID) {
        try {
            const data = await Currencies.findOne({ where: { userID } });
            if (data) return data.get({ plain: true });
            else return false;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function setData(userID, options = {}) {
        if (typeof options != 'object' && !Array.isArray(options)) throw new Error("Cần một đối tượng.");
        try {
            const user = await Currencies.findOne({ where: { userID } });
            if (user) {
                await user.update(options);
                return true;
            }
            throw new Error("Người dùng không tồn tại.");
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function delData(userID) {
        try {
            const user = await Currencies.findOne({ where: { userID } });
            if (user) {
                await user.destroy();
                return true;
            }
            throw new Error("Người dùng không tồn tại.");
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function createData(userID, defaults = {}) {
        if (typeof defaults != 'object' && !Array.isArray(defaults)) throw new Error("Cần một đối tượng.");
        try {
            await Currencies.findOrCreate({ where: { userID }, defaults });
            return true;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function increaseMoney(userID, money) {
        if (typeof money != 'number' || isNaN(money) || money <= 0) throw new Error("Cần một số dương.");
        try {
            const data = await getData(userID);
            if (!data) throw new Error("Người dùng không tồn tại.");
            const balance = Number(data.money); // Chuyển đổi sang số
            await setData(userID, { money: balance + money });
            return true;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    async function decreaseMoney(userID, money) {
        if (typeof money != 'number' || isNaN(money) || money <= 0) throw new Error("Cần một số dương.");
        try {
            const data = await getData(userID);
            if (!data) throw new Error("Người dùng không tồn tại.");
            let balance = Number(data.money); // Chuyển đổi sang số
            if (balance < money) return false;
            await setData(userID, { money: balance - money });
            return true;
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }

    return {
        getAll,
        getData,
        setData,
        delData,
        createData,
        increaseMoney,
        decreaseMoney
    };
};
